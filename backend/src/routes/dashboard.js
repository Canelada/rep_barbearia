/**
 * Dashboard Routes
 * Dashboard principal com estatísticas gerais do sistema.
 *
 * Endpoints:
 * - GET /api/dashboard - Estatísticas completas (resumo, agendamentos, receitas, comparativos)
 */
import express from 'express';
import Agendamento from '../models/Agendamento.js';
import Servico from '../models/Servico.js';
import User from '../models/userModel.js';
import Caixa from '../models/Caixa.js';
import Produto from '../models/Produto.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validation.js';
import dayjs from 'dayjs';
import logger from '../utils/logger.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { mes, ano } = req.query;

    const targetDate = mes && ano
      ? dayjs().year(parseInt(ano)).month(parseInt(mes) - 1)
      : dayjs();

    const hoje = dayjs().startOf('day');
    const inicioMes = targetDate.startOf('month');
    const fimMes = targetDate.endOf('month');
    const inicioMesAnterior = inicioMes.subtract(1, 'month');
    const fimMesAnterior = inicioMes.subtract(1, 'day').endOf('month');

    const agendamentosMes = await Agendamento.countDocuments({
      dataHora: {
        $gte: inicioMes.toDate(),
        $lte: fimMes.toDate(),
      },
    });

    const agendamentosMesAnterior = await Agendamento.countDocuments({
      dataHora: {
        $gte: inicioMesAnterior.toDate(),
        $lte: fimMesAnterior.toDate(),
      },
    });

    const agendamentosHoje = await Agendamento.countDocuments({
      dataHora: {
        $gte: hoje.toDate(),
        $lt: hoje.add(1, 'day').toDate(),
      },
    });

    const agendamentosConfirmadosHoje = await Agendamento.countDocuments({
      dataHora: {
        $gte: hoje.toDate(),
        $lt: hoje.add(1, 'day').toDate(),
      },
      status: 'confirmado',
    });

    const agendamentosConfirmadosMes = await Agendamento.countDocuments({
      dataHora: {
        $gte: inicioMes.toDate(),
        $lte: fimMes.toDate(),
      },
      status: { $in: ['confirmado', 'concluido'] },
    });

    let proximoAgendamento = await Agendamento.findOne({
      dataHora: { $gte: new Date() },
      status: { $in: ['agendado', 'confirmado'] },
    })
      .populate('servicoId', 'nome duracao preco')
      .populate('funcionarioId', 'nome')
      .sort({ dataHora: 1 })
      .lean();

    if (proximoAgendamento) {
      proximoAgendamento = {
        ...proximoAgendamento,
        servicoNome:
          proximoAgendamento.servicoId?.nome || 'Serviço não informado',
        funcionarioNome:
          proximoAgendamento.funcionarioId?.nome || 'Funcionário não informado',
        valor:
          proximoAgendamento.preco || proximoAgendamento.servicoId?.preco || 0,
      };
    }

    let proximosAgendamentos = await Agendamento.find({
      dataHora: {
        $gte: inicioMes.toDate(),
        $lte: fimMes.toDate(),
      },
      status: { $nin: ['cancelado'] },
    })
      .populate('servicoId', 'nome duracao preco')
      .populate('funcionarioId', 'nome')
      .sort({ dataHora: -1 })
      .limit(20)
      .lean();

    proximosAgendamentos = proximosAgendamentos.map((ag) => ({
      ...ag,
      servicoNome: ag.servicoId?.nome || 'Serviço não informado',
      funcionarioNome: ag.funcionarioId?.nome || 'Funcionário não informado',
      valor: ag.preco || ag.servicoId?.preco || 0,
    }));

    const caixasMes = await Caixa.find({
      data: {
        $gte: inicioMes.format('YYYY-MM-DD'),
        $lte: fimMes.format('YYYY-MM-DD'),
      },
    });

    const caixasMesAnterior = await Caixa.find({
      data: {
        $gte: inicioMesAnterior.format('YYYY-MM-DD'),
        $lte: fimMesAnterior.format('YYYY-MM-DD'),
      },
    });

    let receitaMes = caixasMes.reduce((total, caixa) => {
      return (
        total +
        caixa.entradas.reduce(
          (subtotal, entrada) => subtotal + entrada.valor,
          0
        )
      );
    }, 0);

    if (receitaMes === 0) {
      const agendamentosConcluidosMes = await Agendamento.find({
        dataHora: {
          $gte: inicioMes.toDate(),
          $lte: fimMes.toDate(),
        },
        status: 'concluido',
      });

      receitaMes = agendamentosConcluidosMes.reduce((total, agendamento) => {
        return total + (agendamento.preco || 0);
      }, 0);
    }

    const despesasMes = caixasMes.reduce((total, caixa) => {
      return (
        total +
        caixa.saidas.reduce((subtotal, saida) => subtotal + saida.valor, 0)
      );
    }, 0);

    const receitaMesAnterior = caixasMesAnterior.reduce((total, caixa) => {
      return (
        total +
        caixa.entradas.reduce(
          (subtotal, entrada) => subtotal + entrada.valor,
          0
        )
      );
    }, 0);

    const despesasMesAnterior = caixasMesAnterior.reduce((total, caixa) => {
      return (
        total +
        caixa.saidas.reduce((subtotal, saida) => subtotal + saida.valor, 0)
      );
    }, 0);

    const produtosBaixoEstoque = await Produto.find({
      $expr: { $lte: ['$quantidadeAtual', '$quantidadeMinima'] },
      ativo: true,
    }).select('nome quantidadeAtual quantidadeMinima');

    const servicosMaisProcurados = await Agendamento.aggregate([
      {
        $match: {
          dataHora: {
            $gte: inicioMes.toDate(),
            $lte: fimMes.toDate(),
          },
          status: { $in: ['concluido', 'confirmado'] },
        },
      },
      {
        $group: {
          _id: '$servicoId',
          quantidade: { $sum: 1 },
          receita: { $sum: '$preco' },
        },
      },
      {
        $lookup: {
          from: 'servicos',
          localField: '_id',
          foreignField: '_id',
          as: 'servicoInfo',
        },
      },
      {
        $unwind: '$servicoInfo',
      },
      {
        $project: {
          nome: '$servicoInfo.nome',
          quantidade: 1,
          receita: 1,
        },
      },
      {
        $sort: { quantidade: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    const performanceBarbeiros = await Agendamento.aggregate([
      {
        $match: {
          dataHora: {
            $gte: inicioMes.toDate(),
            $lte: fimMes.toDate(),
          },
          status: { $in: ['concluido', 'confirmado'] },
        },
      },
      {
        $group: {
          _id: '$funcionarioId',
          atendimentos: { $sum: 1 },
          receita: { $sum: '$preco' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'funcionarioInfo',
        },
      },
      {
        $unwind: '$funcionarioInfo',
      },
      {
        $project: {
          nome: '$funcionarioInfo.nome',
          atendimentos: 1,
          receita: 1,
        },
      },
      {
        $sort: { atendimentos: -1 },
      },
    ]);

    const evolucaoReceita = caixasMes
      .map((caixa) => ({
        data: caixa.data,
        receita: caixa.entradas.reduce(
          (total, entrada) => total + entrada.valor,
          0
        ),
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const agendamentosPorStatus = await Agendamento.aggregate([
      {
        $match: {
          dataHora: {
            $gte: inicioMes.toDate(),
            $lte: fimMes.toDate(),
          },
        },
      },
      {
        $group: {
          _id: '$status',
          quantidade: { $sum: 1 },
        },
      },
    ]);

    const movimentacaoRecentes = await Caixa.aggregate([
      {
        $match: {
          data: {
            $gte: inicioMes.format('YYYY-MM-DD'),
            $lte: fimMes.format('YYYY-MM-DD'),
          },
        },
      },
      {
        $project: {
          data: 1,
          movimentacoes: {
            $concatArrays: [
              {
                $map: {
                  input: '$entradas',
                  as: 'entrada',
                  in: {
                    tipo: 'entrada',
                    categoria: '$$entrada.categoria',
                    valor: '$$entrada.valor',
                    descricao: '$$entrada.descricao',
                    data: '$data',
                  },
                },
              },
              {
                $map: {
                  input: '$saidas',
                  as: 'saida',
                  in: {
                    tipo: 'saida',
                    categoria: '$$saida.categoria',
                    valor: '$$saida.valor',
                    descricao: '$$saida.descricao',
                    data: '$data',
                  },
                },
              },
            ],
          },
        },
      },
      {
        $unwind: '$movimentacoes',
      },
      {
        $sort: { data: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          tipo: '$movimentacoes.tipo',
          categoria: '$movimentacoes.categoria',
          valor: '$movimentacoes.valor',
          descricao: '$movimentacoes.descricao',
          data: '$movimentacoes.data',
        },
      },
    ]);

    const resumoPorCategoria = await Caixa.aggregate([
      {
        $match: {
          data: {
            $gte: inicioMes.format('YYYY-MM-DD'),
            $lte: fimMes.format('YYYY-MM-DD'),
          },
        },
      },
      {
        $project: {
          entradas: 1,
          saidas: 1,
        },
      },
      {
        $facet: {
          entradas: [
            { $unwind: '$entradas' },
            {
              $group: {
                _id: '$entradas.categoria',
                total: { $sum: '$entradas.valor' },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
          saidas: [
            { $unwind: '$saidas' },
            {
              $group: {
                _id: '$saidas.categoria',
                total: { $sum: '$saidas.valor' },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
        },
      },
    ]);

    const lucroAtual = receitaMes - despesasMes;
    const lucroAnterior = receitaMesAnterior - despesasMesAnterior;

    const dashboard = {
      resumo: {
        agendamentosHoje,
        agendamentosConfirmadosHoje,
        agendamentosMes,
        agendamentosMesAnterior,
        receitaHoje: 0, // Será calculado se for hoje
        receitaMes,
        receitaMesAnterior,
        despesasMes,
        despesasMesAnterior,
        lucroMes: lucroAtual,
        lucroMesAnterior: lucroAnterior,
        produtosBaixoEstoque: produtosBaixoEstoque.length,
        taxaOcupacao: agendamentosMes > 0 ? Math.round((agendamentosConfirmadosMes / agendamentosMes) * 100) : 0,
      },
      proximoAgendamento,
      proximosAgendamentos,
      produtosBaixoEstoque,
      servicosMaisProcurados,
      performanceBarbeiros,
      evolucaoReceita,
      agendamentosPorStatus,
      movimentacaoRecentes,
      resumoPorCategoria: resumoPorCategoria[0] || { entradas: [], saidas: [] },
      comparativos: {
        agendamentos: {
          atual: agendamentosMes,
          anterior: agendamentosMesAnterior,
          variacao:
            agendamentosMesAnterior > 0
              ? (
                  ((agendamentosMes - agendamentosMesAnterior) /
                    agendamentosMesAnterior) *
                  100
                ).toFixed(1)
              : 0,
        },
        receita: {
          atual: receitaMes,
          anterior: receitaMesAnterior,
          variacao:
            receitaMesAnterior > 0
              ? (
                  ((receitaMes - receitaMesAnterior) / receitaMesAnterior) *
                  100
                ).toFixed(1)
              : 0,
        },
        despesas: {
          atual: despesasMes,
          anterior: despesasMesAnterior,
          variacao:
            despesasMesAnterior > 0
              ? (
                  ((despesasMes - despesasMesAnterior) / despesasMesAnterior) *
                  100
                ).toFixed(1)
              : 0,
        },
        lucro: {
          atual: lucroAtual,
          anterior: lucroAnterior,
          variacao:
            lucroAnterior !== 0
              ? (
                  ((lucroAtual - lucroAnterior) / Math.abs(lucroAnterior)) *
                  100
                ).toFixed(1)
              : 0,
        },
      },
      periodo: {
        mes: parseInt(mes) || targetDate.month() + 1,
        ano: parseInt(ano) || targetDate.year(),
        nomeMes: targetDate.format('MMMM'),
      },
    };

    const caixaHoje = await Caixa.findOne({
      data: hoje.format('YYYY-MM-DD'),
    });

    let receitaHoje = 0;
    if (caixaHoje) {
      receitaHoje = caixaHoje.entradas.reduce(
        (total, entrada) => total + entrada.valor,
        0
      );
    }

    if (receitaHoje === 0) {
      const agendamentosConcluidosHoje = await Agendamento.find({
        dataHora: {
          $gte: hoje.toDate(),
          $lt: hoje.add(1, 'day').toDate(),
        },
        status: 'concluido',
      });

      receitaHoje = agendamentosConcluidosHoje.reduce((total, agendamento) => {
        return total + (agendamento.preco || 0);
      }, 0);
    }

    dashboard.resumo.receitaHoje = receitaHoje;

    const formasPagamentoAgregadas = await Agendamento.aggregate([
      {
        $match: {
          dataHora: {
            $gte: inicioMes.toDate(),
            $lte: fimMes.toDate(),
          },
          status: { $in: ['confirmado', 'concluido'] },
          metodoPagamento: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$metodoPagamento',
          quantidade: { $sum: 1 },
          total: { $sum: '$preco' },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    const nomesPagamento = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      outros: 'Outros',
    };

    const formasPagamento = formasPagamentoAgregadas.map((forma) => ({
      nome: nomesPagamento[forma._id] || forma._id,
      quantidade: forma.quantidade,
      total: forma.total,
    }));

    dashboard.formasPagamento = formasPagamento;

    res.json({
      success: true,
      message: 'Dashboard carregado com sucesso',
      data: dashboard,
    });
  })
);

export default router;
