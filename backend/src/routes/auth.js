/**
 * Auth Routes
 * Rotas de autenticação do sistema.
 *
 * Endpoints:
 * - POST /api/auth/register - Registra primeiro admin (bootstrap)
 * - POST /api/auth/login - Login com JWT
 * - POST /api/auth/verify - Valida token
 * - POST /api/auth/refresh - Renova token
 * - POST /api/auth/logout - Logout
 * - POST /api/auth/change-password - Altera senha (primeiro login)
 * - PUT /api/auth/alterar-senha - Altera senha autenticada
 */
import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { validateLogin } from '../utils/validators.js';
import { body } from 'express-validator';

const router = express.Router();

router.post(
  '/register',
  [
    body('nome')
      .notEmpty()
      .withMessage('Nome é obrigatório')
      .isLength({ max: 100 })
      .withMessage('Nome deve ter no máximo 100 caracteres'),
    body('usuario')
      .isLength({ min: 3, max: 50 })
      .withMessage('Usuário deve ter entre 3 e 50 caracteres')
      .toLowerCase(),
    body('senha')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'funcionario', 'barbeiro'])
      .withMessage('Role deve ser admin, manager, funcionario ou barbeiro'),
  ],
  handleValidationErrors,
  AuthController.register
);

router.post('/login', 
  loginLimiter,
  validateLogin,
  handleValidationErrors,
  AuthController.login
);

router.post('/verify',
  authenticateToken,
  AuthController.verifyToken
);

router.post('/refresh',
  authenticateToken,
  AuthController.refreshToken
);

router.post('/logout',
  authenticateToken,
  AuthController.logout
);

router.post('/change-password',
  authenticateToken,
  [
    body('novaSenha')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres')
  ],
  handleValidationErrors,
  AuthController.changePassword
);

router.put('/alterar-senha',
  authenticateToken,
  [
    body('senhaAtual')
      .isLength({ min: 6 })
      .withMessage('Senha atual é obrigatória'),
    body('novaSenha')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
  ],
  handleValidationErrors,
  AuthController.alterarSenha
);

export default router;
