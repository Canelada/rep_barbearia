import connectToDatabase from '../lib/mongodb.js';
import logger from '../utils/logger.js';

/**
 * Middleware simplificado para garantir conexão MongoDB
 * Usa cache global otimizado para Vercel
 */
export const ensureDbConnection = async (req, res, next) => {
  // Pular para rotas que não precisam de DB
  const skipDbPaths = ['/health', '/favicon.ico', '/api', '/', '/robots.txt'];

  if (
    skipDbPaths.some((path) => req.path.startsWith(path)) &&
    req.path.length <= 10
  ) {
    return next();
  }

  const startTime = Date.now();

  try {
    // Usar a função de conexão otimizada
    await connectToDatabase();

    const connectionTime = Date.now() - startTime;
    logger.info(`MongoDB pronto em ${connectionTime}ms`, {
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    const connectionTime = Date.now() - startTime;

    logger.error(`Falha na conexão MongoDB após ${connectionTime}ms:`, {
      error: error.message,
      path: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Resposta de erro padronizada
    return res.status(503).json({
      success: false,
      message: 'Serviço temporariamente indisponível. Tente novamente.',
      error: 'DATABASE_CONNECTION_FAILED',
      retryAfter: 5,
    });
  }
};

/**
 * Middleware de limpeza simplificado
 */
export const cleanupConnections = (req, res, next) => {
  // Em ambiente serverless, deixar a conexão ser gerenciada automaticamente
  // O MongoDB driver já possui mecanismos de cleanup automático
  next();
};

export default {
  ensureDbConnection,
  cleanupConnections,
};
