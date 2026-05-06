/**
 * Servicos Routes
 * CRUD de serviços oferecidos pela barbearia.
 *
 * Endpoints:
 * - GET /api/servicos - Lista todos os serviços
 * - GET /api/servicos/ativos/lista - Lista serviços ativos
 * - GET /api/servicos/:id - Busca serviço por ID
 * - POST /api/servicos - Cria serviço
 * - PUT /api/servicos/:id - Atualiza serviço
 * - DELETE /api/servicos/:id - Exclui serviço
 */
import express from 'express';
import Servico from '../models/Servico.js';
import pagination from '../middleware/pagination.js';
import { registrarLog, extrairInfoRequest } from '../utils/auditLogger.js';

const router = express.Router();

router.get('/', pagination, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;

    const [servicos, total] = await Promise.all([
      Servico.find()
        .sort({ categoria: 1, nome: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Servico.countDocuments(),
    ]);

    res.json({
      success: true,
      data: servicos,
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
        message: 'Erro ao buscar serviços',
        error: error.message,
      });
  }
});

router.get('/ativos/lista', pagination, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;

    const [servicos, total] = await Promise.all([
      Servico.find({ ativo: true })
        .sort({ categoria: 1, nome: 1 })
        .select('nome categoria preco duracaoMin')
        .skip(skip)
        .limit(limit)
        .lean(),
      Servico.countDocuments({ ativo: true }),
    ]);

    res.json({
      success: true,
      data: servicos,
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
        message: 'Erro ao buscar serviços ativos',
        error: error.message,
      });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const servico = await Servico.findById(req.params.id);
    if (!servico) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
    }
    res.json({ success: true, data: servico });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar serviço', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, descricao, categoria, preco, duracaoMin, comissao, ativo } = req.body;

    if (!nome || !categoria || !preco || !duracaoMin) {
      return res.status(400).json({ success: false, message: 'Nome, categoria, preço e duração são obrigatórios' });
    }

    if (preco <= 0) {
      return res.status(400).json({ success: false, message: 'Preço deve ser maior que zero' });
    }

    if (duracaoMin <= 0) {
      return res.status(400).json({ success: false, message: 'Duração deve ser maior que zero' });
    }

    const servicoExistente = await Servico.findOne({ nome: { $regex: new RegExp(`^${nome}$`, 'i') } });
    if (servicoExistente) {
      return res.status(400).json({ success: false, message: 'Já existe um serviço com este nome' });
    }

    const novoServico = new Servico({
      nome,
      descricao,
      categoria,
      preco: parseFloat(preco),
      duracaoMin: parseInt(duracaoMin),
      comissao: parseFloat(comissao) || 0,
      ativo: ativo !== false
    });

    const servicoSalvo = await novoServico.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'servico',
      entidadeId: servicoSalvo._id,
      entidadeNome: servicoSalvo.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: servicoSalvo.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Serviço "${servicoSalvo.nome}" criado - R$ ${servicoSalvo.preco}`,
    });

    res.status(201).json({ success: true, message: 'Serviço criado com sucesso', data: servicoSalvo });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: mensagens });
    }
    res.status(500).json({ success: false, message: 'Erro ao criar serviço', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, categoria, preco, duracaoMin, comissao, ativo } = req.body;

    const servico = await Servico.findById(id);
    if (!servico) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
    }

    const dadosAnteriores = servico.toObject();

    if (!nome || !categoria || !preco || !duracaoMin) {
      return res.status(400).json({ success: false, message: 'Nome, categoria, preço e duração são obrigatórios' });
    }

    if (preco <= 0) {
      return res.status(400).json({ success: false, message: 'Preço deve ser maior que zero' });
    }

    if (duracaoMin <= 0) {
      return res.status(400).json({ success: false, message: 'Duração deve ser maior que zero' });
    }

    const servicoExistente = await Servico.findOne({
      nome: { $regex: new RegExp(`^${nome}$`, 'i') },
      _id: { $ne: id }
    });
    if (servicoExistente) {
      return res.status(400).json({ success: false, message: 'Já existe outro serviço com este nome' });
    }

    const servicoAtualizado = await Servico.findByIdAndUpdate(
      id,
      {
        nome,
        descricao,
        categoria,
        preco: parseFloat(preco),
        duracaoMin: parseInt(duracaoMin),
        comissao: parseFloat(comissao) || 0,
        ativo: ativo !== false
      },
      { new: true, runValidators: true }
    );

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'atualizar',
      entidade: 'servico',
      entidadeId: servicoAtualizado._id,
      entidadeNome: servicoAtualizado.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: servicoAtualizado.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Serviço "${servicoAtualizado.nome}" atualizado - R$ ${servicoAtualizado.preco}`,
    });

    res.json({ success: true, message: 'Serviço atualizado com sucesso', data: servicoAtualizado });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: mensagens });
    }
    res.status(500).json({ success: false, message: 'Erro ao atualizar serviço', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const servico = await Servico.findById(id);
    if (!servico) {
      return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
    }

    const dadosAnteriores = servico.toObject();
    const nomeServico = servico.nome;

    await Servico.findByIdAndDelete(id);

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'excluir',
      entidade: 'servico',
      entidadeId: id,
      entidadeNome: nomeServico,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Serviço "${nomeServico}" excluído`,
    });

    res.json({ success: true, message: 'Serviço excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir serviço', error: error.message });
  }
});

export default router;
