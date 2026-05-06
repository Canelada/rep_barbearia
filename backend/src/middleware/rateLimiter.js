import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Rate limiter geral adaptado para Vercel
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por janela
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuração específica para Vercel/serverless
  trustProxy: true,
  validate: {
    trustProxy: false, // Desabilita validação para evitar warnings
    xForwardedForHeader: false
  },
  handler: (req, res) => {
    logger.warn('Rate limit excedido:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas. Tente novamente em alguns minutos.'
    });
  }
});

// Rate limiter mais restritivo para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // não conta requests bem-sucedidos
  // Configuração específica para Vercel/serverless
  trustProxy: true,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  },
  handler: (req, res) => {
    logger.warn('Rate limit de login excedido:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: { usuario: req.body?.usuario }
    });
    
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    });
  }
});

// Rate limiter para APIs públicas (como webhook)
export const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto
  message: {
    success: false,
    message: 'Limite de requisições excedido'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuração específica para Vercel/serverless
  trustProxy: true,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false
  }
});
