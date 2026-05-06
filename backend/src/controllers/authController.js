/**
 * Auth Controller
 * Controlador de autenticação do sistema.
 *
 * Métodos:
 * - register: Registra primeiro usuário admin (bootstrap)
 * - login: Autenticação com JWT
 * - verifyToken: Validação de token
 * - refreshToken: Renovação de token
 * - logout: Encerramento de sessão
 * - changePassword: Alteração de senha (primeiro login)
 * - alterarSenha: Alteração de senha autenticada
 */
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/validation.js';
import connectToDatabase from '../lib/mongodb.js';
import { registrarLog } from '../utils/auditLogger.js';

const AUTH_COOKIE_NAME = 'token';
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

export class AuthController {
  static register = asyncHandler(async (req, res) => {
    const { nome, usuario, senha, role = 'admin' } = req.body;

    // Verificar se já existe algum usuário no sistema.
    const totalUsuarios = await User.countDocuments();
    if (totalUsuarios > 0) {
      return res.status(403).json({
        success: false,
        message: 'Sistema já possui usuários cadastrados. Use a área administrativa para criar novos usuários.'
      });
    }

    // Verificar se usuário já existe
    const usuarioExistente = await User.findOne({ usuario });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já existe'
      });
    }

    // Criar usuário
    const novoUsuario = new User({
      nome,
      usuario,
      senhaHash: senha, // Será hasheada pelo middleware do modelo
      role
    });

    await novoUsuario.save();

    logger.info('Primeiro usuário criado no sistema', {
      usuarioId: novoUsuario._id,
      usuario: novoUsuario.usuario,
      role: novoUsuario.role,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        usuario: novoUsuario.usuario,
        role: novoUsuario.role
      }
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { usuario, senha } = req.body;

    try {
      // Conexão otimizada para Vercel/serverless
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        const mongoose = await import('mongoose');

        try {
          await mongoose.default.disconnect();
        } catch (e) {}

        const options = {
          maxPoolSize: 1,
          serverSelectionTimeoutMS: 1000,
          socketTimeoutMS: 2000,
          connectTimeoutMS: 2000,
          bufferCommands: false,
          maxIdleTimeMS: 3000,
          retryWrites: false,
          retryReads: false,
          heartbeatFrequencyMS: 60000,
          authSource: 'admin',
        };

        await mongoose.default.connect(process.env.MONGODB_URI, options);
      } else {
        await connectToDatabase();
      }
      
      logger.info(`Tentativa de login para usuário: ${usuario}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const user = await User.findOne({ usuario, ativo: true })
        .select('+senhaHash')
        .maxTimeMS(1000)
        .lean()
        .exec();
      
      if (!user) {
        logger.warn(`Usuário não encontrado: ${usuario}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      const bcrypt = await import('bcryptjs');
      const senhaValida = await bcrypt.default.compare(senha, user.senhaHash);
      
      if (!senhaValida) {
        logger.warn(`Senha inválida para usuário: ${usuario}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      const token = jwt.sign(
        { 
          id: user._id, 
          role: user.role,
          usuario: user.usuario 
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '8h' 
        }
      );

      res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

      User.findByIdAndUpdate(user._id, {
        ultimoLogin: new Date()
      }).exec().catch(err => {
        logger.error('Erro ao atualizar último login:', err);
      });

      logger.info(`Login realizado com sucesso: ${usuario}`, {
        userId: user._id,
        role: user.role,
        ip: req.ip
      });

      // Registrar log de auditoria
      await registrarLog({
        acao: 'login',
        entidade: 'auth',
        entidadeId: user._id,
        entidadeNome: user.nome,
        usuarioId: user._id,
        usuarioNome: user.nome,
        ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent'),
        detalhes: `Login realizado por "${user.nome}" (${user.role})`,
      });

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: {
            id: user._id,
            _id: user._id,
            nome: user.nome,
            usuario: user.usuario,
            role: user.role,
            comissao: user.comissao,
            ultimoLogin: user.ultimoLogin
          }
        }
      });
    } catch (error) {
      logger.error('Erro no processo de login:', {
        error: error.message,
        stack: error.stack,
        usuario,
        ip: req.ip
      });

      // Se for erro de timeout, retornar mensagem específica
      if (error.name === 'MongooseError' && error.message.includes('timeout')) {
        return res.status(503).json({
          success: false,
          message: 'Serviço temporariamente indisponível. Tente novamente em alguns momentos.',
          error: 'DATABASE_TIMEOUT'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  static verifyToken = asyncHandler(async (req, res) => {
    const user = req.user;

    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: {
          id: user._id,
          nome: user.nome,
          usuario: user.usuario,
          role: user.role,
          ultimoLogin: user.ultimoLogin
        }
      }
    });
  });

  static refreshToken = asyncHandler(async (req, res) => {
    const user = req.user;

    const newToken = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        usuario: user.usuario 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '8h' 
      }
    );

    res.cookie(AUTH_COOKIE_NAME, newToken, AUTH_COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        token: newToken
      }
    });
  });

  static logout = asyncHandler(async (req, res) => {
    logger.info(`Logout realizado: ${req.user.usuario}`, {
      userId: req.user._id,
      ip: req.ip
    });

    // Registrar log de auditoria
    await registrarLog({
      acao: 'logout',
      entidade: 'auth',
      entidadeId: req.user._id,
      entidadeNome: req.user.nome,
      usuarioId: req.user._id,
      usuarioNome: req.user.nome,
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
      userAgent: req.get('User-Agent'),
      detalhes: `Logout realizado por "${req.user.nome}"`,
    });

    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  });

  static changePassword = asyncHandler(async (req, res) => {
    const { novaSenha } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Atualizar senha
    user.senhaHash = novaSenha;
    await user.save();

    logger.info(`Senha padrão alterada para usuário: ${user.usuario}`, {
      userId: user._id,
      ip: req.ip
    });

    // Retornar dados do usuário para login automático
    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
      data: {
        user: {
          id: user._id,
          nome: user.nome,
          usuario: user.usuario,
          role: user.role,
          ativo: user.ativo
        }
      }
    });
  });

  static alterarSenha = asyncHandler(async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const user = await User.findById(req.user._id);

    // Verificar senha atual
    const senhaValida = await user.verificarSenha(senhaAtual);
    if (!senhaValida) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    user.senhaHash = novaSenha;
    await user.save();

    logger.info(`Senha alterada para usuário: ${user.usuario}`, {
      userId: user._id,
      ip: req.ip
    });

    // Registrar log de auditoria
    await registrarLog({
      acao: 'atualizar',
      entidade: 'auth',
      entidadeId: user._id,
      entidadeNome: user.nome,
      usuarioId: req.user._id,
      usuarioNome: req.user.nome,
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
      userAgent: req.get('User-Agent'),
      detalhes: `Senha alterada para "${user.nome}"`,
    });

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  });
}

export default AuthController;
