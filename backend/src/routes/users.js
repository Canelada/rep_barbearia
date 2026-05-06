/**
 * Users Routes
 * CRUD de usuários/funcionários do sistema.
 * Inclui gerenciamento de permissões e horários de trabalho.
 *
 * Endpoints:
 * - GET /api/users - Lista usuários
 * - GET /api/users/funcionarios - Lista funcionários ativos
 * - GET /api/users/:id - Busca usuário por ID
 * - POST /api/users - Cria usuário (Admin/Manager)
 * - POST /api/users/funcionario-basico - Cria funcionário básico
 * - PUT /api/users/:id - Atualiza usuário
 * - DELETE /api/users/:id - Exclui usuário (Admin)
 * - PATCH /api/users/:id/toggle-status - Ativa/Desativa usuário
 * - GET /api/users/estatisticas/usuarios - Estatísticas
 */
import express from 'express';
import User from '../models/userModel.js';
import pagination from '../middleware/pagination.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors, asyncHandler } from '../middleware/validation.js';
import { validateId } from '../utils/validators.js';
import { registrarLog, extrairInfoRequest, limparDadosSensiveis } from '../utils/auditLogger.js';

const router = express.Router();

router.get('/', pagination, async (req, res) => {
  try {
    const { role, ativo } = req.query;
    const { page, limit, skip } = req.pagination;
    const filtros = {};
    if (role) filtros.role = role;
    if (ativo !== undefined) filtros.ativo = ativo === 'true';

    const [usuarios, total] = await Promise.all([
      User.find(filtros)
        .select('-senhaHash')
        .sort({ nome: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filtros),
    ]);

    res.json({
      success: true,
      message: 'Usuários listados com sucesso',
      data: usuarios,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Erro ao buscar usuários',
        error: error.message,
      });
  }
});

router.get('/auth',
  authenticateToken,
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const { role, ativo } = req.query;
    const filtros = {};
    if (role) filtros.role = role;
    if (ativo !== undefined) filtros.ativo = ativo === 'true';

    const usuarios = await User.find(filtros).select('-senhaHash').sort({ nome: 1 });
    res.json({ success: true, message: 'Usuários listados com sucesso', data: usuarios });
  })
);

router.get(
  '/funcionarios',
  authenticateToken,
  pagination,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const [funcionarios, total] = await Promise.all([
      User.find({ role: 'funcionario', ativo: true })
        .select('nome usuario role')
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'funcionario', ativo: true }),
    ]);

    res.json({
      success: true,
      message: 'Funcionários listados com sucesso',
      data: funcionarios,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

router.get('/estatisticas/usuarios',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const usuarios = await User.find({});

    const estatisticas = {
      total: usuarios.length,
      ativos: usuarios.filter(u => u.ativo).length,
      inativos: usuarios.filter(u => !u.ativo).length,
      admins: usuarios.filter(u => u.role === 'admin').length,
      funcionarios: usuarios.filter(u => u.role === 'funcionario').length,
      ultimosLogins: usuarios
        .filter(u => u.ultimoLogin)
        .sort((a, b) => new Date(b.ultimoLogin) - new Date(a.ultimoLogin))
        .slice(0, 5)
        .map(u => ({ nome: u.nome, usuario: u.usuario, ultimoLogin: u.ultimoLogin }))
    };

    res.json({ success: true, message: 'Estatísticas dos usuários', data: estatisticas });
  })
);

router.get('/:id',
  authenticateToken,
  validateId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const usuario = await User.findById(req.params.id).select('-senhaHash');
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.json({ success: true, message: 'Usuário encontrado', data: usuario });
  })
);

router.post('/funcionario-basico', async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório e deve ter pelo menos 2 caracteres' });
    }

    const funcionarioExistente = await User.findOne({
      nome: { $regex: new RegExp(`^${nome.trim()}$`, 'i') },
      role: 'funcionario'
    });

    if (funcionarioExistente) {
      return res.status(400).json({ success: false, message: 'Já existe um funcionário com este nome' });
    }

    const nomeClean = nome.trim().toLowerCase().replace(/\s+/g, '');
    const novoFuncionario = new User({
      nome: nome.trim(),
      email: `${nomeClean}@barbearia.local`,
      usuario: nomeClean,
      senhaHash: '123456',
      role: 'funcionario',
      salario: 0,
      comissao: 0,
      ativo: true
    });

    const funcionarioSalvo = await novoFuncionario.save();

    res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso',
      data: { _id: funcionarioSalvo._id, nome: funcionarioSalvo.nome, role: funcionarioSalvo.role, ativo: funcionarioSalvo.ativo }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: mensagens });
    }
    res.status(500).json({ success: false, message: 'Erro ao criar funcionário', error: error.message });
  }
});

router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { nome, telefone, email, cpf, cnpj, endereco, observacoes, usuario, senha, cargo, comissao, ativo, horarioTrabalho } = req.body;

    if (!nome) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    if (usuario) {
      const usuarioExistente = await User.findOne({ usuario });
      if (usuarioExistente) {
        return res.status(400).json({ success: false, message: 'Nome de usuário já existe' });
      }
    }

    const novoUsuario = new User({
      nome,
      telefone,
      email,
      cpf,
      cnpj,
      endereco,
      observacoes,
      usuario: usuario || nome.toLowerCase().replace(/\s+/g, '.'),
      senhaHash: senha || '123456',
      role: cargo || 'funcionario',
      comissao: parseFloat(comissao) || 0,
      ativo: ativo !== false,
      horarioTrabalho: horarioTrabalho || {
        segunda: { ativo: true, inicio: '08:00', fim: '18:00' },
        terca: { ativo: true, inicio: '08:00', fim: '18:00' },
        quarta: { ativo: true, inicio: '08:00', fim: '18:00' },
        quinta: { ativo: true, inicio: '08:00', fim: '18:00' },
        sexta: { ativo: true, inicio: '08:00', fim: '18:00' },
        sabado: { ativo: true, inicio: '08:00', fim: '16:00' },
        domingo: { ativo: false, inicio: '08:00', fim: '16:00' }
      }
    });

    await novoUsuario.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'usuario',
      entidadeId: novoUsuario._id,
      entidadeNome: novoUsuario.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: limparDadosSensiveis(novoUsuario.toObject()),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Funcionário "${novoUsuario.nome}" criado com cargo ${novoUsuario.role}`,
    });

    res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso',
      data: { id: novoUsuario._id, nome: novoUsuario.nome, telefone: novoUsuario.telefone, usuario: novoUsuario.usuario, role: novoUsuario.role, comissao: novoUsuario.comissao, ativo: novoUsuario.ativo }
    });
  })
);

router.put('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';
    const isOwnUser = req.user._id.toString() === req.params.id;

    if (!isAdmin && !isManager && !isOwnUser) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    const dadosAnteriores = limparDadosSensiveis(usuario.toObject());

    const { nome, telefone, email, cpf, cnpj, endereco, observacoes, cargo, senha, comissao, ativo, horarioTrabalho } = req.body;

    if (nome) usuario.nome = nome;
    if (telefone !== undefined) usuario.telefone = telefone;
    if (email !== undefined) usuario.email = email;
    if (cpf !== undefined) usuario.cpf = cpf;
    if (cnpj !== undefined) usuario.cnpj = cnpj;
    if (endereco !== undefined) usuario.endereco = endereco;
    if (observacoes !== undefined) usuario.observacoes = observacoes;
    if (horarioTrabalho !== undefined) usuario.horarioTrabalho = horarioTrabalho;
    if (senha && senha.length >= 6) usuario.senhaHash = senha;

    if (isAdmin || isManager) {
      if (cargo) usuario.role = cargo;
      if (comissao !== undefined) usuario.comissao = parseFloat(comissao) || 0;
      if (ativo !== undefined) usuario.ativo = ativo;
    }

    await usuario.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'atualizar',
      entidade: 'usuario',
      entidadeId: usuario._id,
      entidadeNome: usuario.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: limparDadosSensiveis(usuario.toObject()),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Funcionário "${usuario.nome}" atualizado`,
    });

    res.json({
      success: true,
      message: 'Funcionário atualizado com sucesso',
      data: { id: usuario._id, nome: usuario.nome, telefone: usuario.telefone, usuario: usuario.usuario, role: usuario.role, comissao: usuario.comissao, ativo: usuario.ativo }
    });
  })
);

router.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const usuario = await User.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    if (usuario._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Não é possível excluir o próprio usuário' });
    }

    const dadosAnteriores = limparDadosSensiveis(usuario.toObject());
    await User.findByIdAndDelete(req.params.id);

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'excluir',
      entidade: 'usuario',
      entidadeId: usuario._id,
      entidadeNome: usuario.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Funcionário "${usuario.nome}" excluído`,
    });

    res.json({ success: true, message: 'Funcionário excluído com sucesso' });
  })
);

router.patch('/:id/toggle-status',
  authenticateToken,
  authorizeRoles('admin'),
  validateId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const usuario = await User.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    if (usuario._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Não é possível desativar o próprio usuário' });
    }

    const statusAnterior = usuario.ativo;
    usuario.ativo = !usuario.ativo;
    await usuario.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'status',
      entidade: 'usuario',
      entidadeId: usuario._id,
      entidadeNome: usuario.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores: { ativo: statusAnterior },
      dadosNovos: { ativo: usuario.ativo },
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Funcionário "${usuario.nome}" ${usuario.ativo ? 'ativado' : 'desativado'}`,
    });

    res.json({
      success: true,
      message: `Usuário ${usuario.ativo ? 'ativado' : 'desativado'} com sucesso`,
      data: { id: usuario._id, nome: usuario.nome, usuario: usuario.usuario, role: usuario.role, ativo: usuario.ativo }
    });
  })
);

export default router;
