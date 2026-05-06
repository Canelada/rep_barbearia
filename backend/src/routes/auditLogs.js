/**
 * Audit Logs Routes
 * Rotas para consulta de logs de auditoria do sistema.
 * Acesso restrito a administradores.
 *
 * Endpoints:
 * - GET /api/audit-logs - Lista logs com filtros e paginação
 * - GET /api/audit-logs/estatisticas - Estatísticas de atividades
 * - GET /api/audit-logs/:id - Busca log específico
 */
import express from 'express';
import AuditLog from '../models/AuditLog.js';
import pagination from '../middleware/pagination.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validation.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  pagination,
  asyncHandler(async (req, res) => {
    const { entidade, acao, usuarioId, dataInicio, dataFim, busca } = req.query;
    const { page, limit, skip } = req.pagination;

    const filtros = {};

    if (entidade) filtros.entidade = entidade;
    if (acao) filtros.acao = acao;
    if (usuarioId) filtros.usuarioId = usuarioId;

    if (dataInicio || dataFim) {
      filtros.createdAt = {};
      if (dataInicio) filtros.createdAt.$gte = new Date(dataInicio);
      if (dataFim) {
        const dataFimAjustada = new Date(dataFim);
        dataFimAjustada.setHours(23, 59, 59, 999);
        filtros.createdAt.$lte = dataFimAjustada;
      }
    }

    if (busca) {
      filtros.$or = [
        { entidadeNome: { $regex: busca, $options: 'i' } },
        { usuarioNome: { $regex: busca, $options: 'i' } },
        { detalhes: { $regex: busca, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filtros)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filtros),
    ]);

    res.json({
      success: true,
      message: 'Logs de auditoria',
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

router.get('/estatisticas',
  authenticateToken,
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);

    const mesAtras = new Date();
    mesAtras.setDate(mesAtras.getDate() - 30);

    const [total, logHoje, logSemana, logMes] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: hoje } }),
      AuditLog.countDocuments({ createdAt: { $gte: semanaAtras } }),
      AuditLog.countDocuments({ createdAt: { $gte: mesAtras } }),
    ]);

    res.json({
      success: true,
      message: 'Estatísticas de auditoria',
      data: {
        total,
        hoje: logHoje,
        semana: logSemana,
        mes: logMes,
      },
    });
  })
);

router.get('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const log = await AuditLog.findById(req.params.id).lean();

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log não encontrado' });
    }

    res.json({ success: true, message: 'Log encontrado', data: log });
  })
);

export default router;
