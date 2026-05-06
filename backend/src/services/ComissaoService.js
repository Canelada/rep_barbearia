/**
 * Comissão Service
 * Serviço centralizado para cálculos e processamento de comissões
 */
import PagamentoComissao from '../models/PagamentoComissao.js';
import Agendamento from '../models/Agendamento.js';
import User from '../models/userModel.js';

class ComissaoService {
  /**
   * Calcula comissão para um funcionário em um período
   * @param {string} funcionarioId - ID do funcionário
   * @param {Date} dataInicio - Data inicial do período
   * @param {Date} dataFim - Data final do período
   * @returns {object} Resultado com totalComissao e detalhes
   */
  static async calcularComissaoPorPeriodo(funcionarioId, dataInicio, dataFim) {
    try {
      const agendamentos = await Agendamento.find({
        funcionarioId,
        dataHora: { $gte: dataInicio, $lte: dataFim },
        status: { $in: ['concluido', 'confirmado'] }
      }).lean();

      let totalComissao = 0;
      const agendamentosComissao = [];

      for (const agendamento of agendamentos) {
        const comissao = this.calcularComissaoAgendamento(agendamento);
        totalComissao += comissao;
        agendamentosComissao.push({
          agendamentoId: agendamento._id,
          servicoNome: agendamento.servicoNome || 'N/A',
          valor: agendamento.preco || 0,
          comissao: comissao
        });
      }

      return {
        funcionarioId,
        totalComissao,
        agendamentosComissao,
        dataInicio,
        dataFim,
        quantidadeAgendamentos: agendamentos.length
      };
    } catch (error) {
      throw new Error(`Erro ao calcular comissão para funcionário ${funcionarioId}: ${error.message}`);
    }
  }

  /**
   * Calcula comissão de um agendamento individual
   * @param {object} agendamento - Objeto de agendamento
   * @returns {number} Valor da comissão
   */
  static calcularComissaoAgendamento(agendamento) {
    try {
      let comissaoTotal = 0;

      // Se tem múltiplos serviços
      if (agendamento.servicos && agendamento.servicos.length > 0) {
        comissaoTotal = agendamento.servicos.reduce((total, servico) => {
          const valorServico = servico.preco || 0;
          const percentualComissao = servico.comissao || 0;
          return total + (valorServico * (percentualComissao / 100));
        }, 0);
      }
      // Se tem serviço único (formato antigo)
      else {
        const valorServico = agendamento.preco || agendamento.valor || 0;
        const percentualComissao = agendamento.comissao || 10;
        comissaoTotal = valorServico * (percentualComissao / 100);
      }

      return parseFloat(comissaoTotal.toFixed(2));
    } catch (error) {
      throw new Error(`Erro ao calcular comissão do agendamento: ${error.message}`);
    }
  }

  /**
   * Processa comissões para todos os funcionários no início do mês
   * @returns {Array} Array de comissões criadas
   */
  static async processarComissoesInicioMês() {
    try {
      const agora = new Date();
      const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      ultimoDia.setHours(23, 59, 59, 999);

      const funcionarios = await User.find({ role: 'funcionario', ativo: true }).lean();

      const resultados = [];
      for (const funcionario of funcionarios) {
        try {
          const resultado = await this.calcularComissaoPorPeriodo(
            funcionario._id,
            primeiroDia,
            ultimoDia
          );

          // Salvar no banco
          const pagamento = new PagamentoComissao({
            funcionarioId: resultado.funcionarioId,
            totalComissao: resultado.totalComissao,
            agendamentos: resultado.agendamentosComissao,
            dataInicio: resultado.dataInicio,
            dataFim: resultado.dataFim,
            quantidadeAgendamentos: resultado.quantidadeAgendamentos,
            statusPagamento: 'pendente'
          });
          await pagamento.save();

          resultados.push(pagamento);
        } catch (error) {
          // Log e continua com próximo funcionário
          console.error(`Erro ao processar comissão de ${funcionario._id}:`, error.message);
        }
      }

      return resultados;
    } catch (error) {
      throw new Error(`Erro ao processar comissões do mês: ${error.message}`);
    }
  }

  /**
   * Busca comissões com paginação
   * @param {object} filtro - Filtro de busca
   * @param {number} skip - Documentos para pular
   * @param {number} limit - Limite de documentos
   * @returns {object} {pagamentos, total}
   */
  static async buscarComissoes(filtro = {}, skip = 0, limit = 20) {
    try {
      const [pagamentos, total] = await Promise.all([
        PagamentoComissao.find(filtro)
          .skip(skip)
          .limit(limit)
          .sort({ dataCriacao: -1 })
          .lean(),
        PagamentoComissao.countDocuments(filtro)
      ]);

      return {
        pagamentos,
        total,
        pagina: Math.floor(skip / limit) + 1,
        totalPaginas: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Erro ao buscar comissões: ${error.message}`);
    }
  }

  /**
   * Marca comissão como paga
   * @param {string} pagamentoId - ID do pagamento
   * @returns {object} Pagamento atualizado
   */
  static async marcarComoPaga(pagamentoId) {
    try {
      const pagamento = await PagamentoComissao.findByIdAndUpdate(
        pagamentoId,
        {
          statusPagamento: 'pago',
          dataPagamento: new Date()
        },
        { new: true }
      );

      return pagamento;
    } catch (error) {
      throw new Error(`Erro ao marcar comissão como paga: ${error.message}`);
    }
  }

  /**
   * Calcula estatísticas de comissões
   * @param {Date} dataInicio - Data inicial
   * @param {Date} dataFim - Data final
   * @returns {object} Estatísticas
   */
  static async calcularEstatisticas(dataInicio, dataFim) {
    try {
      const filtro = {
        dataInicio: { $gte: dataInicio },
        dataFim: { $lte: dataFim }
      };

      const pagamentos = await PagamentoComissao.find(filtro).lean();

      const totalComissoes = pagamentos.reduce((sum, p) => sum + (p.totalComissao || 0), 0);
      const totalAgendamentos = pagamentos.reduce((sum, p) => sum + (p.quantidadeAgendamentos || 0), 0);
      const mediaComissaoPorFuncionario = pagamentos.length > 0 ? totalComissoes / pagamentos.length : 0;

      const comissoesPorStatus = {
        pago: pagamentos.filter(p => p.statusPagamento === 'pago').reduce((sum, p) => sum + (p.totalComissao || 0), 0),
        pendente: pagamentos.filter(p => p.statusPagamento === 'pendente').reduce((sum, p) => sum + (p.totalComissao || 0), 0),
        processando: pagamentos.filter(p => p.statusPagamento === 'processando').reduce((sum, p) => sum + (p.totalComissao || 0), 0)
      };

      return {
        totalComissoes,
        totalAgendamentos,
        totalFuncionarios: pagamentos.length,
        mediaComissaoPorFuncionario: parseFloat(mediaComissaoPorFuncionario.toFixed(2)),
        comissoesPorStatus,
        periodo: { dataInicio, dataFim }
      };
    } catch (error) {
      throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
    }
  }
}

export default ComissaoService;
