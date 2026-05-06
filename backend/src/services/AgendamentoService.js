import Agendamento from '../models/Agendamento.js';
import Servico from '../models/Servico.js';

export class AgendamentoService {
  /**
   * Obtém horários disponíveis para agendamento
   */
  static async obterHorariosDisponiveis(data, funcionarioId, servicoId) {
    try {
      const servico = await Servico.findById(servicoId);
      if (!servico) {
        throw new Error('Serviço não encontrado');
      }

      const duracaoMin = servico.duracaoMin;
      
      // Configurações de horário de funcionamento
      const inicioExpediente = 9; // 9h
      const fimExpediente = 18; // 18h
      const intervaloMin = 30; // intervalos de 30 minutos

      // Buscar agendamentos existentes para a data e funcionário
      const inicioData = new Date(`${data}T00:00:00`);
      const fimData = new Date(`${data}T23:59:59`);

      const agendamentosExistentes = await Agendamento.find({
        funcionarioId,
        dataHora: {
          $gte: inicioData,
          $lte: fimData
        },
        status: { $in: ['agendado', 'confirmado', 'em_andamento'] }
      }).populate('servicoId');

      // Criar lista de horários ocupados
      const horariosOcupados = agendamentosExistentes.map(agendamento => {
        const inicio = new Date(agendamento.dataHora);
        const duracaoServico = agendamento.servicoId?.duracaoMin || 30;
        const fim = new Date(inicio.getTime() + duracaoServico * 60000);
        
        return { inicio, fim };
      });

      // Gerar horários disponíveis
      const horariosDisponiveis = [];
      
      for (let hora = inicioExpediente; hora < fimExpediente; hora++) {
        for (let minuto = 0; minuto < 60; minuto += intervaloMin) {
          const inicioSlot = new Date(`${data}T${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}:00`);
          const fimSlot = new Date(inicioSlot.getTime() + duracaoMin * 60000);

          // Verificar se o slot não vai além do horário de funcionamento
          if (fimSlot.getHours() > fimExpediente) {
            continue;
          }

          // Verificar se não há conflito com agendamentos existentes
          const temConflito = horariosOcupados.some(ocupado => {
            return (
              (inicioSlot >= ocupado.inicio && inicioSlot < ocupado.fim) ||
              (fimSlot > ocupado.inicio && fimSlot <= ocupado.fim) ||
              (inicioSlot <= ocupado.inicio && fimSlot >= ocupado.fim)
            );
          });

          // Verificar se o horário não é no passado
          const agora = new Date();
          if (inicioSlot <= agora) {
            continue;
          }

          if (!temConflito) {
            horariosDisponiveis.push(inicioSlot);
          }
        }
      }

      return horariosDisponiveis;
    } catch (error) {
      throw new Error(`Erro ao obter horários disponíveis: ${error.message}`);
    }
  }

  /**
   * Verifica se um horário está disponível
   */
  static async verificarDisponibilidade(dataHora, funcionarioId, servicoId, agendamentoId = null) {
    try {
      const servico = await Servico.findById(servicoId);
      if (!servico) {
        throw new Error('Serviço não encontrado');
      }

      const inicio = new Date(dataHora);
      const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);

      // Buscar agendamentos conflitantes
      const query = {
        funcionarioId,
        status: { $in: ['agendado', 'confirmado', 'em_andamento'] },
        $or: [
          {
            dataHora: { $gte: inicio, $lt: fim }
          },
          {
            $expr: {
              $and: [
                { $lte: ['$dataHora', inicio] },
                { $gt: [{ $add: ['$dataHora', { $multiply: ['$servicoId.duracaoMin', 60000] }] }, inicio] }
              ]
            }
          }
        ]
      };

      // Excluir o próprio agendamento se estiver editando
      if (agendamentoId) {
        query._id = { $ne: agendamentoId };
      }

      const conflitos = await Agendamento.find(query).populate('servicoId').populate('funcionarioId');

      const disponivel = conflitos.length === 0;

      // Retornar objeto com mais informações
      return {
        disponivel,
        conflitos: conflitos.map(c => ({
          id: c._id,
          clienteNome: c.clienteNome,
          dataHora: c.dataHora,
          servico: c.servicoId?.nome,
          funcionario: c.funcionarioId?.nome
        }))
      };
    } catch (error) {
      throw new Error(`Erro ao verificar disponibilidade: ${error.message}`);
    }
  }

  /**
   * Busca agendamentos com filtros
   */
  static async buscarAgendamentos(filtros = {}, opcoes = {}) {
    try {
      const {
        dataInicio,
        dataFim,
        funcionarioId,
        status,
        clienteNome,
        clienteTelefone
      } = filtros;

      const {
        page = 1,
        limit = 50,
        sort = { dataHora: 1 }
      } = opcoes;

      const query = {};

      // Filtros de data
      if (dataInicio || dataFim) {
        query.dataHora = {};
        if (dataInicio) query.dataHora.$gte = new Date(dataInicio);
        if (dataFim) query.dataHora.$lte = new Date(dataFim);
      }

      // Outros filtros
      if (funcionarioId) query.funcionarioId = funcionarioId;
      if (status) query.status = status;
      if (clienteNome) query.clienteNome = new RegExp(clienteNome, 'i');
      if (clienteTelefone) query.clienteTelefone = new RegExp(clienteTelefone, 'i');

      const skip = (page - 1) * limit;

      const [agendamentos, total] = await Promise.all([
        Agendamento.find(query)
          .populate('servicoId', 'nome duracaoMin preco categoria comissao')
          .populate('servicos.servicoId', 'nome duracaoMin preco categoria comissao') // Populate para array de serviços
          .populate('funcionarioId', 'nome')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(), // Para melhor performance e permitir transformações
        Agendamento.countDocuments(query),
      ]);

      // Transformar os dados para incluir informações flattened do serviço
      const agendamentosTransformados = agendamentos.map((agendamento) => ({
        ...agendamento,
        servicoNome: agendamento.servicoId?.nome || 'Serviço não informado',
        servicoPreco: agendamento.servicoId?.preco || 0,
        duracaoMin: agendamento.servicoId?.duracaoMin || 30,
        funcionarioNome:
          agendamento.funcionarioId?.nome || 'Funcionário não informado',
        // Usar o preço salvo no agendamento ou o preço do serviço como fallback
        valor: agendamento.preco || agendamento.servicoId?.preco || 0,
      }));

      return {
        agendamentos: agendamentosTransformados,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
    }
  }

  /**
   * Envia lembrete para agendamentos do dia seguinte
   */
  static async enviarLembretes() {
    try {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      
      const inicioAmanha = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 0, 0, 0);
      const fimAmanha = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 23, 59, 59);

      const agendamentos = await Agendamento.find({
        dataHora: {
          $gte: inicioAmanha,
          $lte: fimAmanha
        },
        status: { $in: ['agendado', 'confirmado'] },
        lembreteEnviado: false,
        clienteTelefone: { $exists: true, $ne: '' }
      }).populate('servicoId funcionarioId');

      // Aqui você implementaria o envio real dos lembretes
      // Por exemplo, via WhatsApp, SMS ou email
      
      const resultados = [];
      
      for (const agendamento of agendamentos) {
        try {
          // Simular envio de lembrete
          // await enviarLembreteWhatsApp(agendamento);
          
          agendamento.lembreteEnviado = true;
          await agendamento.save();
          
          resultados.push({
            agendamentoId: agendamento._id,
            cliente: agendamento.clienteNome,
            sucesso: true
          });
        } catch (error) {
          resultados.push({
            agendamentoId: agendamento._id,
            cliente: agendamento.clienteNome,
            sucesso: false,
            erro: error.message
          });
        }
      }

      return resultados;
    } catch (error) {
      throw new Error(`Erro ao enviar lembretes: ${error.message}`);
    }
  }
}

export default AgendamentoService;
