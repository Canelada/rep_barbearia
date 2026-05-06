import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Erro de validação:', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      body: req.body
    });

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errorMessages
    });
  }

  next();
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (req, res, next) => {
  // Não logar rotas de DevTools e outras especiais
  const ignoredPaths = [
    '/.well-known/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/__nextjs',
    '/sw.js',
    '/workbox-',
    '/manifest.json'
  ];

  const shouldIgnore = ignoredPaths.some(path => req.originalUrl.startsWith(path));
  
  if (shouldIgnore) {
    return res.status(404).end();
  }

  const error = new Error(`Rota ${req.originalUrl} não encontrada`);
  error.status = 404;
  next(error);
};

export const errorHandler = (error, req, res, _next) => {
  void _next;

  let statusCode = error.status || error.statusCode || 500;
  let message = error.message || 'Erro interno do servidor';

  // Log do erro
  logger.error('Erro capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Erros específicos do MongoDB
  if (error.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(error.errors).map(err => err.message);
    message = `Erro de validação: ${messages.join(', ')}`;
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
  }

  if (error.code === 11000) {
    statusCode = 400;
    const field = Object.keys(error.keyValue)[0];
    message = `${field} já existe`;
  }

  // Não enviar stack trace em produção
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(statusCode).json(response);
};
