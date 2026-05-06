import express from 'express';
import mongoose from 'mongoose';
import Agendamento from '../models/Agendamento.js';
import PagamentoComissao from '../models/PagamentoComissao.js';
import Caixa from '../models/Caixa.js';
import ComissaoService from '../services/ComissaoService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas de comissão
router.use(authenticateToken);

// GET - Buscar comissões resumidas por período (dia/semana/mês)
router.get('/funcionario/:funcionarioId/resumo', async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    const { dataInicio: dataInicioParam, dataFim: dataFimParam } = req.query;

    // Se fornecido range customizado, usar o serviço para calcular
    if (dataInicioParam && dataFimParam) {
      const dataInicio = new Date(dataInicioParam);
      dataInicio.setHours(0, 0, 0, 0);
      const dataFim = new Date(dataFimParam);
      dataFim.setHours(23, 59, 59, 999);

      const resultado = await ComissaoService.calcularComissaoPorPeriodo(
        funcionarioId,
        dataInicio,
        dataFim,
      );

      return res.json({
        success: true,
        data: resultado,
      });
    }

    // Caso contrário, calcular hoje/semana/mês (comportamento padrão)
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date();
    fimDia.setHours(23, 59, 59, 999);

    // Calcular hoje
    const resultadoHoje = await ComissaoService.calcularComissaoPorPeriodo(
      funcionarioId,
      inicioDia,
      fimDia,
    );
    const comissaoHoje = resultadoHoje.totalComissao;

    // Calcular semana
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 6);
    inicioSemana.setHours(0, 0, 0, 0);

    const resultadoSemana = await ComissaoService.calcularComissaoPorPeriodo(
      funcionarioId,
      inicioSemana,
      fimDia,
    );
    const comissaoSemana = resultadoSemana.totalComissao;

    // Calcular mês
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const resultadoMes = await ComissaoService.calcularComissaoPorPeriodo(
      funcionarioId,
      inicioMes,
      fimDia,
    );
    const comissaoMes = resultadoMes.totalComissao;

    // Calcular comissões PAGAS no mês atual
    const pagamentosMes = await PagamentoComissao.aggregate([
      {
        $match: {
          funcionarioId: new mongoose.Types.ObjectId(funcionarioId),
          dataPagamento: { $gte: inicioMes, $lte: fimDia },
          statusPagamento: { $in: ['pago', 'parcial'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPago: { $sum: '$totalComissao' },
        },
      },
    ]);

    const totalPagoMes =
      pagamentosMes.length > 0 ? pagamentosMes[0].totalPago : 0;
    const totalAPagarMes = Math.max(0, comissaoMes - totalPagoMes);

    res.json({
      success: true,
      data: {
        hoje: {
          comissao: comissaoHoje,
          agendamentos: resultadoHoje.quantidadeAgendamentos,
        },
        semana: {
          comissao: comissaoSemana,
          agendamentos: resultadoSemana.quantidadeAgendamentos,
        },
        mes: {
          comissao: comissaoMes,
          agendamentos: resultadoMes.quantidadeAgendamentos,
          pago: totalPagoMes,
          aPagar: totalAPagarMes,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar resumo de comissões',
      error: error.message,
    });
  }
});

// GET - Buscar histórico de comissões de um funcionário
router.get('/funcionario/:funcionarioId', async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    const {
      meses,
      dataInicio: dataInicioParam,
      dataFim: dataFimParam,
    } = req.query;

    // Determinar período de análise
    let dataInicio, dataFim;

    if (dataInicioParam && dataFimParam) {
      dataInicio = new Date(dataInicioParam);
      dataFim = new Date(dataFimParam);
      dataFim.setHours(23, 59, 59, 999);
    } else {
      const mesesInt = parseInt(meses) || 6;
      dataFim = new Date();
      dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - mesesInt);
    }

    // Buscar usando ComissaoService
    const resultado = await ComissaoService.calcularComissaoPorPeriodo(
      funcionarioId,
      dataInicio,
      dataFim,
    );

    const agendamentosDetalhes = resultado.agendamentosComissao;

    // Determinar o tipo de agrupamento baseado no período
    const diferencaDias = Math.ceil(
      (dataFim - dataInicio) / (1000 * 60 * 60 * 24),
    );
    const agruparPorDia = diferencaDias <= 31;

    // Agrupar agendamentos
    const comissoesPorPeriodo = {};

    agendamentosDetalhes.forEach((item) => {
      // Obter data do agendamento (usar createdAt como fallback)
      const data = new Date();
      let chave, label;

      if (agruparPorDia) {
        chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
        label = data.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
      } else {
        chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const mesesArray = [
          'Jan',
          'Fev',
          'Mar',
          'Abr',
          'Mai',
          'Jun',
          'Jul',
          'Ago',
          'Set',
          'Out',
          'Nov',
          'Dez',
        ];
        label = `${mesesArray[data.getMonth()]}/${data.getFullYear()}`;
      }

      if (!comissoesPorPeriodo[chave]) {
        comissoesPorPeriodo[chave] = {
          mes: label,
          mesAno: chave,
          totalComissao: 0,
          totalServicos: 0,
          agendamentos: 0,
        };
      }

      comissoesPorPeriodo[chave].totalComissao += item.comissao;
      comissoesPorPeriodo[chave].totalServicos += item.valor || 0;
      comissoesPorPeriodo[chave].agendamentos += 1;
    });

    // Converter para array
    const dadosGrafico = Object.values(comissoesPorPeriodo);

    // Calcular totais
    const totalComissao = dadosGrafico.reduce(
      (sum, item) => sum + item.totalComissao,
      0,
    );
    const totalServicos = dadosGrafico.reduce(
      (sum, item) => sum + item.totalServicos,
      0,
    );
    const totalAgendamentos = dadosGrafico.reduce(
      (sum, item) => sum + item.agendamentos,
      0,
    );

    res.json({
      success: true,
      data: {
        grafico: dadosGrafico,
        resumo: {
          totalComissao,
          totalServicos,
          totalAgendamentos,
          mediaComissaoMensal:
            dadosGrafico.length > 0 ? totalComissao / dadosGrafico.length : 0,
          periodo: {
            inicio: dataInicio,
            fim: dataFim,
            meses: parseInt(meses),
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de comissões',
      error: error.message,
    });
  }
});

// POST - Registrar pagamento de comissão
router.post('/pagamento', async (req, res) => {
  try {
    const {
      funcionarioId,
      periodo,
      valorComissao,
      valorPago,
      metodoPagamento,
      observacoes,
      agendamentosIncluidos,
      registrarNoCaixa = true,
      dataPagamento
    } = req.body;

    const usuarioId = req.user?.id || req.user?._id;

    // Usar a data fornecida ou a data atual
    const dataDoPagemento = dataPagamento
      ? new Date(dataPagamento)
      : new Date();
    // Validações
    if (!funcionarioId || !valorPago) {
      return res.status(400).json({
        success: false,
        message: 'Funcionário e valor pago são obrigatórios',
      });
    }

    // Criar registro de pagamento
    const pagamento = new PagamentoComissao({
      funcionarioId,
      periodo: periodo || {
        inicio: new Date(new Date().setDate(1)),
        fim: new Date(),
      },
      valorComissao: valorComissao || valorPago,
      valorPago,
      dataPagamento: dataDoPagemento,
      metodoPagamento: metodoPagamento || 'dinheiro',
      observacoes,
      pagoPor: usuarioId,
      agendamentosIncluidos: agendamentosIncluidos || [],
      status: valorPago >= (valorComissao || valorPago) ? 'pago' : 'parcial',
    });

    await pagamento.save();

    // Se for registrar no caixa
    if (registrarNoCaixa) {
      try {
        // Buscar caixa do dia do pagamento
        const dataCaixa = dataDoPagemento.toISOString().split('T')[0];
        let caixa = await Caixa.findOne({
          data: dataCaixa,
          aberto: true,
          fechado: false,
        });

        if (caixa) {
          // Buscar nome do funcionário
          const User = (await import('../models/User.js')).default;
          const funcionario = await User.findById(funcionarioId);
          const dadosSaida = {
            valor: valorPago,
            descricao: `Comissão - ${funcionario?.nome || 'Funcionário'}`,
            categoria: 'despesas',
            hora: dataDoPagemento.toLocaleTimeString('pt-BR'),
            usuarioId: usuarioId,
          };
          await caixa.adicionarSaida(dadosSaida);

          pagamento.caixaId = caixa._id;
          await pagamento.save();
        } else {
          // Verificar se existe caixa mas está fechado
          const caixaFechado = await Caixa.findOne({ data: dataCaixa });
          if (caixaFechado) {
          } else {
          }
        }
      } catch (caixaError) {
        console.error('❌ Erro ao registrar no caixa:', caixaError.message);
        // Não falhar a operação se houver erro no caixa
      }
    }

    res.json({
      success: true,
      message: 'Pagamento de comissão registrado com sucesso',
      data: pagamento
    });

  } catch (error) {
    console.error('❌ Erro ao registrar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamento de comissão',
      error: error.message
    });
  }
});

// GET - Buscar histórico de pagamentos de comissão de um funcionário
router.get('/pagamentos/:funcionarioId', async (req, res) => {
  try {
    const { funcionarioId } = req.params;
    const { limit = 10, skip = 0 } = req.query;
const pagamentos = await PagamentoComissao.find({
  funcionarioId,
  status: { $in: ['pago', 'parcial'] },
})
  .sort({ dataPagamento: -1 })
  .limit(parseInt(limit))
  .skip(parseInt(skip))
  .populate('pagoPor', 'nome');

    const totalPago = await PagamentoComissao.aggregate([
      {
        $match: {
          funcionarioId: new mongoose.Types.ObjectId(funcionarioId),
          status: { $in: ['pago', 'parcial'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valorPago' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        pagamentos,
        totalPago: totalPago.length > 0 ? totalPago[0].total : 0,
        count: pagamentos.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar pagamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de pagamentos',
      error: error.message
    });
  }
});

export default router;