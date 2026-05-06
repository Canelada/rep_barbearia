/**
 * Caixa Routes
 * Gerenciamento do caixa diário e movimentações financeiras.
 *
 * Endpoints:
 * - GET /api/caixa - Busca caixa por data
 * - GET /api/caixa/relatorio - Relatório financeiro
 * - GET /api/caixa/comparativo - Comparativo mensal
 * - GET /api/caixa/receita-por-tipo - Distribuição de receita
 * - GET /api/caixa/export - Exporta relatório XLSX
 * - GET /api/caixa/:data/status - Status do caixa
 * - POST /api/caixa - Adiciona movimentação
 * - POST /api/caixa/:data/abrir - Abre caixa
 * - PATCH /api/caixa/:data/fechar - Fecha caixa
 */
import express from 'express';
import Caixa from '../models/Caixa.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors, asyncHandler } from '../middleware/validation.js';
import pagination from '../middleware/pagination.js';
import { validateCaixaMovimentacao, validateDateRange } from '../utils/validators.js';
import * as XLSX from 'xlsx';
import { registrarLog, extrairInfoRequest } from '../utils/auditLogger.js';

const router = express.Router();

router.get('/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ success: false, message: 'Data é obrigatória' });
    }

    let caixa = await Caixa.findOne({ data });
    const Agendamento = (await import('../models/Agendamento.js')).default;

    const inicioData = new Date(`${data}T00:00:00.000Z`);
    const fimData = new Date(`${data}T23:59:59.999Z`);

    const agendamentosConcluidos = await Agendamento.find({
      dataHora: { $gte: inicioData, $lte: fimData },
      status: 'concluido',
    })
      .populate('servicoId', 'nome categoria preco')
      .populate('funcionarioId', 'nome')
      .lean();

    const receitaAgendamentos = agendamentosConcluidos.reduce((total, ag) => total + (ag.preco || ag.servicoId?.preco || 0), 0);

    if (!caixa) {
      caixa = {
        data,
        entradas: [],
        saidas: [],
        saldoInicial: 0,
        saldoFinal: 0,
        totalEntradas: receitaAgendamentos,
        totalSaidas: 0,
        saldoDia: receitaAgendamentos,
        agendamentosConcluidos: agendamentosConcluidos.length,
        receitaAgendamentos,
        status: { aberto: false, fechado: false, podeReceberMovimentacoes: false, dataAbertura: null, dataFechamento: null }
      };
    } else {
      const totalEntradasManuais = caixa.entradas.reduce((total, entrada) => total + entrada.valor, 0);
      const totalSaidasManuais = caixa.saidas.reduce((total, saida) => total + saida.valor, 0);

      caixa = {
        ...caixa.toObject(),
        totalEntradas: totalEntradasManuais + receitaAgendamentos,
        totalSaidas: totalSaidasManuais,
        saldoDia: (totalEntradasManuais + receitaAgendamentos) - totalSaidasManuais,
        agendamentosConcluidos: agendamentosConcluidos.length,
        receitaAgendamentos,
        status: {
          aberto: caixa.aberto,
          fechado: caixa.fechado,
          podeReceberMovimentacoes: caixa.podeReceberMovimentacoes(),
          dataAbertura: caixa.dataAbertura,
          dataFechamento: caixa.dataFechamento
        }
      };
    }

    res.json({
      success: true,
      message: 'Caixa encontrado',
      data: caixa,
      agendamentos: agendamentosConcluidos.map(ag => ({
        id: ag._id,
        clienteNome: ag.clienteNome,
        servicoNome: ag.servicoId?.nome || 'Serviço não informado',
        preco: ag.preco || ag.servicoId?.preco || 0,
        categoria: ag.servicoId?.categoria || 'servicos',
        hora: new Date(ag.dataHora).toLocaleTimeString('pt-BR'),
      })),
    });
  })
);

router.post('/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  validateCaixaMovimentacao,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { valor, descricao, categoria, tipo } = req.body;
    const data = new Date().toISOString().split('T')[0];

    const caixa = await Caixa.findOne({ data });
    if (!caixa) {
      return res.status(400).json({ success: false, message: 'Caixa deve ser aberto antes de realizar movimentações' });
    }

    if (!caixa.podeReceberMovimentacoes()) {
      return res.status(400).json({ success: false, message: 'Caixa não está disponível para movimentações (deve estar aberto e não fechado)' });
    }

    const movimentacao = { valor, descricao, categoria, usuarioId: req.user._id, hora: new Date().toLocaleTimeString('pt-BR') };

    if (tipo === 'entrada') {
      await caixa.adicionarEntrada(movimentacao);
    } else {
      await caixa.adicionarSaida(movimentacao);
    }

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'movimentar',
      entidade: 'caixa',
      entidadeId: caixa._id,
      entidadeNome: `Caixa ${data}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: { tipo, valor, descricao, categoria },
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${valor.toFixed(2)} - ${descricao}`,
    });

    res.json({ success: true, message: 'Movimentação adicionada com sucesso', data: caixa });
  })
);

router.get(
  '/relatorio',
  authenticateToken,
  pagination,
  validateDateRange,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const { page, limit, skip } = req.pagination;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Data inicial e final são obrigatórias',
        });
    }

    const [registros, total] = await Promise.all([
      Caixa.find({ data: { $gte: startDate, $lte: endDate } })
        .sort({ data: 1 })
        .skip(skip)
        .limit(limit),
      Caixa.countDocuments({ data: { $gte: startDate, $lte: endDate } }),
    ]);

    const relatorio = registros.map((reg) => ({
      data: reg.data,
      receita: reg.totalEntradas,
      despesas: reg.totalSaidas,
      saldo: reg.saldoDia,
    }));

    res.json({
      success: true,
      message: 'Relatório gerado com sucesso',
      data: relatorio,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

router.get('/comparativo',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const inicioMesAtual = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const fimMesAtual = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];
    const inicioMesAnterior = new Date(anoAnterior, mesAnterior, 1).toISOString().split('T')[0];
    const fimMesAnterior = new Date(anoAnterior, mesAnterior + 1, 0).toISOString().split('T')[0];

    const [registrosAtuais, registrosAnteriores] = await Promise.all([
      Caixa.find({ data: { $gte: inicioMesAtual, $lte: fimMesAtual } }),
      Caixa.find({ data: { $gte: inicioMesAnterior, $lte: fimMesAnterior } })
    ]);

    const calcularTotais = (registros) => ({
      receita: registros.reduce((total, reg) => total + reg.totalEntradas, 0),
      despesas: registros.reduce((total, reg) => total + reg.totalSaidas, 0),
      saldo: registros.reduce((total, reg) => total + reg.saldoDia, 0)
    });

    res.json({
      success: true,
      message: 'Comparativo gerado com sucesso',
      data: [
        { periodo: 'Mês Atual', ...calcularTotais(registrosAtuais) },
        { periodo: 'Mês Anterior', ...calcularTotais(registrosAnteriores) }
      ]
    });
  })
);

router.get('/receita-por-tipo',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const registros = await Caixa.find({});
    const resumoPorTipo = {};

    registros.forEach(registro => {
      registro.entradas.forEach(entrada => {
        const tipo = entrada.categoria || entrada.descricao.toLowerCase();
        resumoPorTipo[tipo] = (resumoPorTipo[tipo] || 0) + entrada.valor;
      });
    });

    const distribuicao = Object.entries(resumoPorTipo).map(([tipo, valor]) => ({ tipo, valor }));
    res.json({ success: true, message: 'Distribuição por tipo gerada com sucesso', data: distribuicao });
  })
);

router.get('/export',
  authenticateToken,
  validateDateRange,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Data inicial e final são obrigatórias' });
    }

    const registros = await Caixa.find({ data: { $gte: startDate, $lte: endDate } }).sort({ data: 1 });
    if (registros.length === 0) {
      return res.status(404).json({ success: false, message: 'Nenhum registro encontrado para o período' });
    }

    const dados = registros.map(reg => ({
      Data: reg.data,
      'Total Entradas (R$)': reg.totalEntradas.toFixed(2),
      'Total Saídas (R$)': reg.totalSaidas.toFixed(2),
      'Saldo do Dia (R$)': reg.saldoDia.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Caixa');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_caixa.xlsx');
    res.send(buffer);
  })
);

router.get('/:data/status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { data } = req.params;
    const caixa = await Caixa.findOne({ data }).populate('abertoPor', 'nome').populate('fechadoPor', 'nome');

    const status = {
      existe: !!caixa,
      aberto: caixa?.aberto || false,
      fechado: caixa?.fechado || false,
      saldoInicial: caixa?.saldoInicial || 0,
      saldoFinal: caixa?.saldoFinal || 0,
      dataAbertura: caixa?.dataAbertura,
      dataFechamento: caixa?.dataFechamento,
      abertoPor: caixa?.abertoPor?.nome,
      fechadoPor: caixa?.fechadoPor?.nome,
      observacoes: caixa?.observacoes,
      podeReceberMovimentacoes: caixa?.podeReceberMovimentacoes() || false
    };

    res.json({ success: true, message: 'Status do caixa', data: status });
  })
);

router.post('/:data/abrir',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { data } = req.params;
    const { saldoInicial = 0, observacoes } = req.body;

    let caixa = await Caixa.findOne({ data });

    if (caixa) {
      if (caixa.aberto) {
        return res.status(400).json({ success: false, message: 'Caixa já está aberto para este dia' });
      }
      if (caixa.fechado) {
        return res.status(400).json({ success: false, message: 'Caixa já foi fechado e não pode ser reaberto' });
      }
    } else {
      caixa = new Caixa({ data, entradas: [], saidas: [], saldoInicial: 0 });
    }

    if (observacoes) caixa.observacoes = observacoes;
    await caixa.abrirCaixa(req.user._id, parseFloat(saldoInicial) || 0);

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'caixa',
      entidadeId: caixa._id,
      entidadeNome: `Caixa ${data}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: caixa.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Caixa aberto com saldo inicial de R$ ${caixa.saldoInicial.toFixed(2)}`,
    });

    res.json({ success: true, message: 'Caixa aberto com sucesso', data: caixa });
  })
);

router.patch('/:data/fechar',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { data } = req.params;
    const { observacoes } = req.body;

    const caixa = await Caixa.findOne({ data });
    if (!caixa) {
      return res.status(404).json({ success: false, message: 'Caixa não encontrado para esta data' });
    }
    if (caixa.fechado) {
      return res.status(400).json({ success: false, message: 'Caixa já foi fechado' });
    }
    if (!caixa.aberto) {
      return res.status(400).json({ success: false, message: 'Caixa deve estar aberto para ser fechado' });
    }

    if (observacoes) caixa.observacoes = observacoes;
    await caixa.fecharCaixa(req.user._id);

    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'status',
      entidade: 'caixa',
      entidadeId: caixa._id,
      entidadeNome: `Caixa ${data}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: caixa.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Caixa fechado com saldo final de R$ ${caixa.saldoFinal.toFixed(2)}`,
    });

    res.json({ success: true, message: 'Caixa fechado com sucesso', data: caixa });
  })
);

export default router;
