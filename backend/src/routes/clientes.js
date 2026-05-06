/**
 * Clientes Routes
 * CRUD de clientes da barbearia.
 *
 * Endpoints:
 * - GET /api/clientes - Lista clientes
 * - GET /api/clientes/aniversariantes/hoje - Aniversariantes do dia
 * - GET /api/clientes/:id - Busca cliente por ID
 * - POST /api/clientes - Cria cliente
 * - PUT /api/clientes/:id - Atualiza cliente
 * - DELETE /api/clientes/:id - Exclui cliente
 */
import express from 'express';
import Cliente from '../models/clienteModel.js';
import pagination from '../middleware/pagination.js';
import { registrarLog, extrairInfoRequest } from '../utils/auditLogger.js';

const router = express.Router();

router.get('/', pagination, async (req, res) => {
  try {
    const { ativo, aniversariantes } = req.query;
    const { page, limit, skip } = req.pagination;
    const filtros = {};
    if (ativo !== undefined) filtros.ativo = ativo === 'true';

    if (aniversariantes === 'hoje') {
      const hoje = new Date();
      filtros.dataAniversario = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    const [clientes, total] = await Promise.all([
      Cliente.find(filtros).sort({ nome: 1 }).skip(skip).limit(limit).lean(),
      Cliente.countDocuments(filtros),
    ]);

    res.json({
      success: true,
      data: clientes,
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
        message: 'Erro ao buscar clientes',
        error: error.message,
      });
  }
});

router.get('/aniversariantes/hoje', async (req, res) => {
  try {
    const hoje = new Date();
    const hojeDM = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;

    const aniversariantes = await Cliente.find({ dataAniversario: hojeDM, ativo: true }).sort({ nome: 1 }).lean();
    res.json({ success: true, data: aniversariantes, total: aniversariantes.length, dataConsulta: hojeDM });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar aniversariantes', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar cliente', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, telefone, cpf, cnpj, dataAniversario, servicoPreferido, observacoes, assinante } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios' });
    }

    const telefoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      return res.status(400).json({ success: false, message: 'Formato de telefone inválido. Use: (11) 99999-9999' });
    }

    if (dataAniversario && !/^\d{2}\/\d{2}$/.test(dataAniversario)) {
      return res.status(400).json({ success: false, message: 'Formato de data de aniversário inválido. Use: DD/MM' });
    }

    const clienteExistente = await Cliente.findOne({ telefone });
    if (clienteExistente) {
      return res.status(400).json({ success: false, message: 'Já existe um cliente com este telefone' });
    }

    const novoCliente = new Cliente({
      nome,
      telefone,
      cpf,
      cnpj,
      dataAniversario,
      servicoPreferido: servicoPreferido || undefined,
      observacoes,
      assinante: assinante || false
    });

    const clienteSalvo = await novoCliente.save();

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'cliente',
      entidadeId: clienteSalvo._id,
      entidadeNome: clienteSalvo.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: clienteSalvo.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Cliente "${clienteSalvo.nome}" criado - Tel: ${clienteSalvo.telefone}`,
    });

    res.status(201).json({ success: true, message: 'Cliente criado com sucesso', data: clienteSalvo });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: mensagens });
    }
    res.status(500).json({ success: false, message: 'Erro ao criar cliente', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cpf, cnpj, dataAniversario, servicoPreferido, observacoes, assinante } = req.body;

    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const dadosAnteriores = cliente.toObject();

    if (!nome || !telefone) {
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios' });
    }

    const telefoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      return res.status(400).json({ success: false, message: 'Formato de telefone inválido. Use: (11) 99999-9999' });
    }

    if (dataAniversario && !/^\d{2}\/\d{2}$/.test(dataAniversario)) {
      return res.status(400).json({ success: false, message: 'Formato de data de aniversário inválido. Use: DD/MM' });
    }

    const clienteExistente = await Cliente.findOne({ telefone, _id: { $ne: id } });
    if (clienteExistente) {
      return res.status(400).json({ success: false, message: 'Já existe outro cliente com este telefone' });
    }

    const clienteAtualizado = await Cliente.findByIdAndUpdate(
      id,
      { nome, telefone, cpf, cnpj, dataAniversario, servicoPreferido: servicoPreferido || undefined, observacoes, assinante: assinante !== undefined ? assinante : false },
      { new: true, runValidators: true }
    );

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'atualizar',
      entidade: 'cliente',
      entidadeId: clienteAtualizado._id,
      entidadeNome: clienteAtualizado.nome,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: clienteAtualizado.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Cliente "${clienteAtualizado.nome}" atualizado`,
    });

    res.json({ success: true, message: 'Cliente atualizado com sucesso', data: clienteAtualizado });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: mensagens });
    }
    res.status(500).json({ success: false, message: 'Erro ao atualizar cliente', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const dadosAnteriores = cliente.toObject();
    const nomeCliente = cliente.nome;

    await Cliente.findByIdAndDelete(id);

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'excluir',
      entidade: 'cliente',
      entidadeId: id,
      entidadeNome: nomeCliente,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Cliente "${nomeCliente}" excluído`,
    });

    res.json({ success: true, message: 'Cliente excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir cliente', error: error.message });
  }
});

export default router;
