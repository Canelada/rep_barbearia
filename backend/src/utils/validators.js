import { body, param, query } from 'express-validator';

// Validações para autenticação
export const validateLogin = [
  body('usuario')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Usuário deve ter entre 3 e 50 caracteres')
    .toLowerCase(),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
];

export const validateUserCreate = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('usuario')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Usuário deve ter entre 3 e 50 caracteres')
    .toLowerCase()
    .matches(/^[a-z0-9._-]+$/)
    .withMessage(
      'Usuário deve conter apenas letras minúsculas, números, ponto, hífen ou underscore'
    ),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'funcionario', 'barbeiro'])
    .withMessage('Role deve ser admin, manager, funcionario ou barbeiro'),
];

// Validações para serviços
export const validateServiceCreate = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('duracaoMin')
    .isInt({ min: 5, max: 480 })
    .withMessage('Duração deve ser entre 5 e 480 minutos'),
  body('preco')
    .isFloat({ min: 0 })
    .withMessage('Preço deve ser um número positivo'),
  body('categoria')
    .optional()
    .isIn(['corte', 'barba', 'combo', 'especial', 'outros'])
    .withMessage('Categoria inválida')
];

// Validações para agendamentos
export const validateAgendamentoCreate = [
  body('clienteNome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do cliente deve ter entre 2 e 100 caracteres'),
  body('clienteTelefone')
    .optional()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Telefone deve conter apenas números e caracteres especiais válidos'),
  body('clienteEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ter um formato válido'),
  // Suportar tanto servicos (novo formato) quanto servicoId (compatibilidade)
  body()
    .custom((value, { req }) => {
      const { servicos, servicoId } = req.body;

      // Deve ter ou servicos ou servicoId
      if (!servicos && !servicoId) {
        throw new Error('É necessário informar pelo menos um serviço');
      }

      // Se tem servicos, validar a estrutura do array
      if (servicos) {
        if (!Array.isArray(servicos) || servicos.length === 0) {
          throw new Error('Lista de serviços deve ser um array não vazio');
        }

        for (const [index, servico] of servicos.entries()) {
          if (!servico.servicoId) {
            throw new Error(`ID do serviço é obrigatório no item ${index + 1}`);
          }
          if (!servico.servicoId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error(`ID do serviço inválido no item ${index + 1}`);
          }
        }
      }

      // Se tem servicoId (formato antigo), validar
      if (servicoId && !servicoId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('ID do serviço inválido');
      }

      return true;
    }),
  body('funcionarioId')
    .isMongoId()
    .withMessage('ID do funcionário inválido'),
  body('dataHora')
    .isISO8601()
    .withMessage('Data e hora devem estar no formato ISO8601')
    .custom((value) => {
      const agendamento = new Date(value);
      const agora = new Date();
      if (agendamento <= agora) {
        throw new Error('Data do agendamento deve ser futura');
      }
      return true;
    }),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
];

// Validações para caixa
export const validateCaixaMovimentacao = [
  body('valor')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que zero'),
  body('descricao')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Descrição deve ter entre 3 e 200 caracteres'),
  body('categoria')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Categoria deve ter no máximo 50 caracteres'),
  body('tipo')
    .isIn(['entrada', 'saida'])
    .withMessage('Tipo deve ser entrada ou saida')
];

// Validações para produtos
export const validateProdutoCreate = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoria deve ter entre 2 e 50 caracteres'),
  body('quantidade')
    .isInt({ min: 0 })
    .withMessage('Quantidade deve ser um número inteiro não negativo'),
  body('quantidadeMinima')
    .isInt({ min: 0 })
    .withMessage('Quantidade mínima deve ser um número inteiro não negativo'),
  body('unidade')
    .isIn(['unidade', 'ml', 'l', 'g', 'kg', 'caixa', 'pacote'])
    .withMessage('Unidade inválida'),
  body('preco')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço deve ser um número positivo')
];

export const validateProdutoMovimentacao = [
  body('tipo')
    .isIn(['entrada', 'saida', 'ajuste'])
    .withMessage('Tipo deve ser entrada, saida ou ajuste'),
  body('quantidade')
    .isInt({ min: 1 })
    .withMessage('Quantidade deve ser um número inteiro positivo'),
  body('motivo')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Motivo deve ter entre 3 e 200 caracteres')
];

// Validações comuns
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido')
];

export const validateDateRange = [
  query('startDate')
    .optional()
    .isDate()
    .withMessage('Data inicial deve ser uma data válida'),
  query('endDate')
    .optional()
    .isDate()
    .withMessage('Data final deve ser uma data válida')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('Data final deve ser posterior à data inicial');
        }
      }
      return true;
    })
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100')
];
