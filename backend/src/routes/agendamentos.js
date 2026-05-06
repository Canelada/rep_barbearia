/**
 * Agendamentos Routes
 * Rotas de agendamentos do sistema.
 *
 * Endpoints:
 * - GET /api/agendamentos - Lista agendamentos (público)
 * - GET /api/agendamentos/auth - Lista agendamentos (autenticado)
 * - GET /api/agendamentos/horarios-disponiveis - Horários disponíveis
 * - GET /api/agendamentos/estatisticas - Estatísticas
 * - GET /api/agendamentos/:id - Busca por ID
 * - POST /api/agendamentos - Cria agendamento
 * - PUT /api/agendamentos/:id - Atualiza agendamento
 * - PATCH /api/agendamentos/:id/cancelar - Cancela
 * - PATCH /api/agendamentos/:id/confirmar - Confirma
 * - PATCH /api/agendamentos/:id/concluir - Conclui
 */
import express from 'express';
import AgendamentoController from '../controllers/agendamentoController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import pagination from '../middleware/pagination.js';
import { validateAgendamentoCreate, validateId, validateDateRange, validatePagination } from '../utils/validators.js';
import { body } from 'express-validator';

const router = express.Router();

router.get('/', pagination, async (req, res) => {
  try {
    await AgendamentoController.listar(req, res);
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
      });
  }
});

router.get(
  '/auth',
  authenticateToken,
  pagination,
  validateDateRange,
  handleValidationErrors,
  AgendamentoController.listar,
);

router.get('/horarios-disponiveis',
  authenticateToken,
  AgendamentoController.obterHorariosDisponiveis
);

router.get('/estatisticas',
  authenticateToken,
  validateDateRange,
  handleValidationErrors,
  AgendamentoController.estatisticas
);

router.get('/:id',
  authenticateToken,
  validateId,
  handleValidationErrors,
  AgendamentoController.buscarPorId
);

router.post('/',
  authenticateToken,
  validateAgendamentoCreate,
  handleValidationErrors,
  AgendamentoController.criar
);

router.put('/:id',
  authenticateToken,
  validateId,
  handleValidationErrors,
  AgendamentoController.atualizar
);

router.patch('/:id/cancelar',
  authenticateToken,
  validateId,
  [
    body('motivo')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Motivo deve ter no máximo 200 caracteres')
  ],
  handleValidationErrors,
  AgendamentoController.cancelar
);

router.patch('/:id/confirmar',
  authenticateToken,
  validateId,
  handleValidationErrors,
  AgendamentoController.confirmar
);

router.patch('/:id/concluir',
  authenticateToken,
  validateId,
  [
    body('metodoPagamento')
      .optional()
      .isIn(['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'outros'])
      .withMessage('Método de pagamento inválido'),
    body('observacoes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres')
  ],
  handleValidationErrors,
  AgendamentoController.concluir
);

export default router;
