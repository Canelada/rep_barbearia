import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const getCookieToken = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [name, ...value] = cookie.trim().split('=');
      return [name, decodeURIComponent(value.join('='))];
    })
  );

  return cookies.token || null;
};

export const authenticateToken = async (req, res, next) => {
  try {
    const token = getCookieToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário completo
    const user = await User.findById(decoded.id).select('-senhaHash');
    
    if (!user || !user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Tentativa de acesso negado para usuário ${req.user.usuario} com role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Privilégios insuficientes.'
      });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = getCookieToken(req);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-senhaHash');
      
      if (user && user.ativo) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Em caso de erro, continua sem usuário autenticado
    next();
  }
};
