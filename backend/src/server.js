/**
 * Server - Express Application
 * Ponto de entrada principal da API.
 * Configura middlewares, rotas e inicialização do servidor.
 *
 * Rotas disponíveis:
 * - /api/auth - Autenticação
 * - /api/agendamentos - Agendamentos
 * - /api/servicos - Serviços
 * - /api/categorias - Categorias
 * - /api/clientes - Clientes
 * - /api/caixa - Caixa/Financeiro
 * - /api/produtos - Produtos/Estoque
 * - /api/users - Usuários/Funcionários
 * - /api/dashboard - Dashboard
 * - /api/whatsapp - Integração WhatsApp
 * - /api/comissao - Comissões
 * - /api/relatorios - Relatórios
 * - /api/audit-logs - Logs de auditoria
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

import database from './config/database.js';
import { getConfig } from './config/environment.js';
import logger from './utils/logger.js';
import { errorHandler, notFound } from './middleware/validation.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { ensureDbConnection, cleanupConnections } from './middleware/serverless.js';

import authRoutes from './routes/auth.js';
import agendamentoRoutes from './routes/agendamentos.js';
import servicoRoutes from './routes/servicos.js';
import categoriaRoutes from './routes/categorias.js';
import clienteRoutes from './routes/clientes.js';
import caixaRoutes from './routes/caixa.js';
import produtoRoutes from './routes/produtos.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import whatsappRoutes from './routes/whatsapp.js';
import comissaoRoutes from './routes/comissao.js';
import relatoriosRoutes from './routes/relatorios.js';
import auditLogRoutes from './routes/auditLogs.js';

const app = express();
const config = getConfig();
const PORT = config.PORT;

app.set('trust proxy', true);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
}));

app.use(compression());
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const ignoredPaths = [
    '/.well-known/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/__nextjs',
    '/sw.js',
    '/workbox-',
    '/manifest.json',
  ];

  const shouldIgnore = ignoredPaths.some((path) => req.url.startsWith(path));

  if (shouldIgnore) {
    return res.status(204).end(); // 204 No Content
  }

  next();
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined,
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'Barbearia Monarca API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api',
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Barbearia Monarca API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        verify: 'POST /api/auth/verify',
      },
      agendamentos: {
        list: 'GET /api/agendamentos',
        create: 'POST /api/agendamentos',
        update: 'PUT /api/agendamentos/:id',
        delete: 'DELETE /api/agendamentos/:id',
        horarios: 'GET /api/agendamentos/horarios-disponiveis',
      },
      servicos: {
        list: 'GET /api/servicos',
        create: 'POST /api/servicos',
        update: 'PUT /api/servicos/:id',
        delete: 'DELETE /api/servicos/:id',
      },
      categorias: {
        list: 'GET /api/categorias',
        create: 'POST /api/categorias',
        stats: 'GET /api/categorias/estatisticas',
      },
      clientes: {
        list: 'GET /api/clientes',
        create: 'POST /api/clientes',
        update: 'PUT /api/clientes/:id',
        delete: 'DELETE /api/clientes/:id',
        aniversariantes: 'GET /api/clientes/aniversariantes/hoje',
      },
      caixa: {
        list: 'GET /api/caixa',
        create: 'POST /api/caixa',
        relatorio: 'GET /api/caixa/relatorio',
        export: 'GET /api/caixa/export',
      },
      produtos: {
        list: 'GET /api/produtos',
        create: 'POST /api/produtos',
        update: 'PUT /api/produtos/:id',
        delete: 'DELETE /api/produtos/:id',
        movimentar: 'PATCH /api/produtos/:id/movimentar',
      },
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
      },
      dashboard: 'GET /api/dashboard',
      whatsapp: {
        webhook: 'POST /api/whatsapp/webhook (Twilio)',
        enviar: 'POST /api/whatsapp/enviar',
        lembrete: 'POST /api/whatsapp/lembrete',
        status: 'GET /api/whatsapp/status',
      },
    },
    health: '/health',
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/health', async (req, res) => {
  const dbStatus = database.isConnected() ? 'connected' : 'disconnected';

  res.json({
    success: true,
    message: 'API está funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: dbStatus,
  });
});

app.use((req, res, next) => {
  if (req.path === '/api/auth/login' && process.env.VERCEL) return next();
  return cleanupConnections(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/api/auth/login' && process.env.VERCEL) return next();
  return ensureDbConnection(req, res, next);
});

app.use('/api/auth', authRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/comissao', comissaoRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      await database.connect();

      app.listen(PORT, () => {
        logger.info(`🚀 Servidor rodando na porta ${PORT}`);
        logger.info(`📊 Dashboard: http://localhost:${PORT}/health`);
        logger.info(`🌍 Ambiente: ${config.NODE_ENV}`);
        logger.info(
          `🔗 CORS configurado para: ${config.CORS_ORIGINS.join(', ')}`
        );
      });
    } else {
      logger.info(`🌐 Ambiente serverless detectado`);
      logger.info(`🌍 Ambiente: ${config.NODE_ENV}`);
    }
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

process.on('SIGTERM', async () => {
  logger.info('⚠️ SIGTERM recebido. Encerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('⚠️ SIGINT recebido. Encerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promise rejeitada não tratada:', { reason, promise });
  process.exit(1);
});

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
