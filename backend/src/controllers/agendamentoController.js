/**
 * Agendamento Controller
 * Controlador de agendamentos do sistema.
 *
 * Métodos:
 * - listar: Lista agendamentos com filtros e paginação
 * - buscarPorId: Busca agendamento específico
 * - criar: Cria novo agendamento (suporta múltiplos serviços)
 * - atualizar: Atualiza agendamento existente
 * - cancelar: Cancela agendamento
 * - confirmar: Confirma agendamento
 * - concluir: Conclui agendamento
 * - obterHorariosDisponiveis: Lista horários disponíveis
 * - estatisticas: Estatísticas de agendamentos
 */
import Agendamento from '../models/Agendamento.js';
import Servico from '../models/Servico.js';
import AgendamentoService from '../services/AgendamentoService.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/validation.js';
import { registrarLog, extrairInfoRequest } from '../utils/auditLogger.js';

export class AgendamentoController {
  static listar = asyncHandler(async (req, res) => {
    const filtros = {
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      funcionarioId: req.query.funcionarioId,
      status: req.query.status,
      clienteNome: req.query.clienteNome,
      clienteTelefone: req.query.clienteTelefone
    };

    const opcoes = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100, // Aumentar o limite para incluir mais agendamentos
      sort: req.query.sort ? JSON.parse(req.query.sort) : { dataHora: -1 } // Mais recentes primeiro
    };

    const resultado = await AgendamentoService.buscarAgendamentos(filtros, opcoes);

    // Para compatibilidade com código existente, retornar direto o array de agendamentos
    // se não há paginação específica sendo solicitada
    if (req.query.page === undefined && req.query.limit === undefined) {
      res.json(resultado.agendamentos);
    } else {
      res.json({
        success: true,
        message: 'Agendamentos listados com sucesso',
        data: resultado
      });
    }
  });

  static buscarPorId = asyncHandler(async (req, res) => {
    const agendamento = await Agendamento.findById(req.params.id)
      .populate('servicoId', 'nome duracaoMin preco categoria comissao')
      .populate('funcionarioId', 'nome');

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Agendamento encontrado',
      data: agendamento
    });
  });

  static criar = asyncHandler(async (req, res) => {
    const {
      clienteNome,
      clienteTelefone,
      clienteEmail,
      servicos, // Nova estrutura para múltiplos serviços
      servicoId, // Manter compatibilidade
      funcionarioId,
      dataHora,
      observacoes,
      origem = 'presencial'
    } = req.body;

    let servicosProcessados = [];
    let duracaoTotal = 0;
    
    // Suportar tanto novo formato (múltiplos serviços) quanto antigo (serviço único)
    if (servicos && servicos.length > 0) {
      // Novo formato com múltiplos serviços
      for (const servicoData of servicos) {
        const servico = await Servico.findById(servicoData.servicoId);
        if (!servico) {
          return res.status(404).json({
            success: false,
            message: `Serviço ${servicoData.servicoId} não encontrado`
          });
        }
        
        servicosProcessados.push({
          servicoId: servico._id,
          preco: servicoData.preco || servico.preco,
          comissao: servicoData.comissao !== undefined ? servicoData.comissao : (servico.comissao || 0)
        });
        
        duracaoTotal += servico.duracaoMin || 30;
      }
    } else if (servicoId) {
      // Formato antigo com serviço único - manter compatibilidade
      const servico = await Servico.findById(servicoId);
      if (!servico) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado'
        });
      }
      
      servicosProcessados.push({
        servicoId: servico._id,
        preco: servico.preco,
        comissao: servico.comissao || 0
      });
      
      duracaoTotal = servico.duracaoMin || 30;
    } else {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar pelo menos um serviço'
      });
    }

    // Verificar disponibilidade com duração total
    const resultadoDisponibilidade = await AgendamentoService.verificarDisponibilidade(
      dataHora,
      funcionarioId,
      servicosProcessados[0].servicoId, // Usar primeiro serviço para compatibilidade
      null,
      duracaoTotal
    );

    if (!resultadoDisponibilidade.disponivel) {
      // Criar mensagem específica baseada no conflito
      const conflito = resultadoDisponibilidade.conflitos[0]; // Primeiro conflito
      const horaConflito = new Date(conflito.dataHora).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return res.status(400).json({
        success: false,
        message: `Funcionário ${conflito.funcionario} já possui agendamento às ${horaConflito} com ${conflito.clienteNome}`,
        conflitos: resultadoDisponibilidade.conflitos
      });
    }

    const dadosAgendamento = {
      clienteNome,
      clienteTelefone,
      clienteEmail,
      funcionarioId,
      dataHora,
      observacoes,
      origem
    };

    // Se múltiplos serviços, usar nova estrutura
    if (servicos && servicos.length > 0) {
      dadosAgendamento.servicos = servicosProcessados;
    } else {
      // Formato antigo para compatibilidade
      dadosAgendamento.servicoId = servicosProcessados[0].servicoId;
      dadosAgendamento.preco = servicosProcessados[0].preco;
      dadosAgendamento.comissao = servicosProcessados[0].comissao;
    }

    const agendamento = new Agendamento(dadosAgendamento);
    await agendamento.save();

    // Populate baseado na estrutura
    if (agendamento.servicos && agendamento.servicos.length > 0) {
      await agendamento.populate('servicos.servicoId funcionarioId');
    } else {
      await agendamento.populate('servicoId funcionarioId');
    }

    logger.info('Agendamento criado', {
      agendamentoId: agendamento._id,
      cliente: clienteNome,
      servicosCount: servicosProcessados.length,
      dataHora,
      criadoPor: req.user?._id
    });

    // Registrar log de auditoria
    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'criar',
      entidade: 'agendamento',
      entidadeId: agendamento._id,
      entidadeNome: `${clienteNome} - ${new Date(dataHora).toLocaleString('pt-BR')}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosNovos: agendamento.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Agendamento criado para ${clienteNome}`,
    });

    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso',
      data: agendamento
    });
  });

  static atualizar = asyncHandler(async (req, res) => {
    const agendamento = await Agendamento.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Capturar dados anteriores para auditoria
    const dadosAnteriores = agendamento.toObject();

    // Verificar permissão: apenas admin pode editar agendamentos concluídos ou cancelados
    if ((agendamento.status === 'concluido' || agendamento.status === 'cancelado') &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem editar agendamentos concluídos ou cancelados'
      });
    }

    // Se mudou data/hora ou funcionário, verificar disponibilidade
    const { dataHora, funcionarioId, servicoId } = req.body;

    // Verificar se houve mudança significativa
    const mudouDataHora = dataHora && dataHora !== agendamento.dataHora.toISOString();
    const mudouFuncionario = funcionarioId && funcionarioId !== agendamento.funcionarioId.toString();
    const mudouServico = servicoId && agendamento.servicoId && servicoId !== agendamento.servicoId.toString();

    if (mudouDataHora || mudouFuncionario || mudouServico) {
      const resultadoDisponibilidade = await AgendamentoService.verificarDisponibilidade(
        dataHora || agendamento.dataHora,
        funcionarioId || agendamento.funcionarioId,
        servicoId || agendamento.servicoId,
        agendamento._id
      );

      if (!resultadoDisponibilidade.disponivel) {
        // Criar mensagem específica baseada no conflito
        const conflito = resultadoDisponibilidade.conflitos[0]; // Primeiro conflito
        const horaConflito = new Date(conflito.dataHora).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return res.status(400).json({
          success: false,
          message: `Funcionário ${conflito.funcionario} já possui agendamento às ${horaConflito} com ${conflito.clienteNome}`,
          conflitos: resultadoDisponibilidade.conflitos
        });
      }
    }

    // Atualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        agendamento[key] = req.body[key];
      }
    });

    await agendamento.save();
    await agendamento.populate('servicoId funcionarioId');

    logger.info('Agendamento atualizado', {
      agendamentoId: agendamento._id,
      atualizadoPor: req.user._id
    });

    // Registrar log de auditoria
    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'atualizar',
      entidade: 'agendamento',
      entidadeId: agendamento._id,
      entidadeNome: `${agendamento.clienteNome} - ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores,
      dadosNovos: agendamento.toObject(),
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Agendamento de ${agendamento.clienteNome} atualizado`,
    });

    res.json({
      success: true,
      message: 'Agendamento atualizado com sucesso',
      data: agendamento
    });
  });

  static cancelar = asyncHandler(async (req, res) => {
    const { motivo } = req.body;
    const agendamento = await Agendamento.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar permissão: apenas admin pode cancelar agendamentos já concluídos ou cancelados
    if ((agendamento.status === 'concluido' || agendamento.status === 'cancelado') &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem cancelar agendamentos concluídos ou já cancelados'
      });
    }

    try {
      // Administradores podem cancelar sem restrições de tempo
      if (req.user.role === 'admin') {
        agendamento.status = 'cancelado';
        agendamento.motivoCancelamento = motivo || '';
        await agendamento.save();
      } else {
        // Usuários normais usam o método com validações
        await agendamento.cancelar(motivo);
      }

      logger.info('Agendamento cancelado', {
        agendamentoId: agendamento._id,
        motivo,
        canceladoPor: req.user._id
      });

      // Registrar log de auditoria
      const infoReq = extrairInfoRequest(req);
      await registrarLog({
        acao: 'status',
        entidade: 'agendamento',
        entidadeId: agendamento._id,
        entidadeNome: `${agendamento.clienteNome} - ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}`,
        usuarioId: infoReq.usuarioId,
        usuarioNome: infoReq.usuarioNome,
        dadosAnteriores: { status: 'agendado' },
        dadosNovos: { status: 'cancelado', motivoCancelamento: motivo },
        ip: infoReq.ip,
        userAgent: infoReq.userAgent,
        detalhes: `Agendamento de ${agendamento.clienteNome} cancelado. Motivo: ${motivo || 'Não informado'}`,
      });

      res.json({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        data: agendamento
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  static confirmar = asyncHandler(async (req, res) => {
    const agendamento = await Agendamento.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    if (agendamento.status !== 'agendado') {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não pode ser confirmado'
      });
    }

    agendamento.status = 'confirmado';
    await agendamento.save();

    logger.info('Agendamento confirmado', {
      agendamentoId: agendamento._id,
      confirmadoPor: req.user._id
    });

    // Registrar log de auditoria
    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'status',
      entidade: 'agendamento',
      entidadeId: agendamento._id,
      entidadeNome: `${agendamento.clienteNome} - ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores: { status: 'agendado' },
      dadosNovos: { status: 'confirmado' },
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Agendamento de ${agendamento.clienteNome} confirmado`,
    });

    res.json({
      success: true,
      message: 'Agendamento confirmado com sucesso',
      data: agendamento
    });
  });

  static concluir = asyncHandler(async (req, res) => {
    const { metodoPagamento, observacoes } = req.body;
    const agendamento = await Agendamento.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    if (!['agendado', 'confirmado', 'em_andamento'].includes(agendamento.status)) {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não pode ser concluído'
      });
    }

    agendamento.status = 'concluido';
    if (metodoPagamento) agendamento.metodoPagamento = metodoPagamento;
    if (observacoes) agendamento.observacoes = observacoes;

    // Desabilitar validação de data futura ao concluir agendamento passado
    await agendamento.save({ validateBeforeSave: false });

    logger.info('Agendamento concluído', {
      agendamentoId: agendamento._id,
      metodoPagamento,
      concluidoPor: req.user._id
    });

    // Registrar log de auditoria
    const infoReq = extrairInfoRequest(req);
    await registrarLog({
      acao: 'status',
      entidade: 'agendamento',
      entidadeId: agendamento._id,
      entidadeNome: `${agendamento.clienteNome} - ${new Date(agendamento.dataHora).toLocaleString('pt-BR')}`,
      usuarioId: infoReq.usuarioId,
      usuarioNome: infoReq.usuarioNome,
      dadosAnteriores: { status: agendamento.status },
      dadosNovos: { status: 'concluido', metodoPagamento },
      ip: infoReq.ip,
      userAgent: infoReq.userAgent,
      detalhes: `Agendamento de ${agendamento.clienteNome} concluído. Pagamento: ${metodoPagamento || 'Não informado'}`,
    });

    res.json({
      success: true,
      message: 'Agendamento concluído com sucesso',
      data: agendamento
    });
  });

  static obterHorariosDisponiveis = asyncHandler(async (req, res) => {
    const { data, funcionarioId, servicoId, duracaoTotal } = req.query;

    if (!data || !funcionarioId) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros obrigatórios: data, funcionarioId'
      });
    }

    // Para compatibilidade, usar servicoId se duracaoTotal não estiver disponível
    let duracao = duracaoTotal ? parseInt(duracaoTotal) : null;
    
    if (!duracao && servicoId) {
      const servico = await Servico.findById(servicoId);
      duracao = servico?.duracaoMin || 30;
    }
    
    if (!duracao) {
      duracao = 30; // Duração padrão
    }

    const horarios = await AgendamentoService.obterHorariosDisponiveis(
      data,
      funcionarioId,
      servicoId,
      duracao
    );

    res.json({
      success: true,
      message: 'Horários disponíveis obtidos com sucesso',
      data: horarios
    });
  });

  static estatisticas = asyncHandler(async (req, res) => {
    const { dataInicio, dataFim } = req.query;

    const filtros = {};
    if (dataInicio || dataFim) {
      filtros.dataHora = {};
      if (dataInicio) filtros.dataHora.$gte = new Date(dataInicio);
      if (dataFim) filtros.dataHora.$lte = new Date(dataFim);
    }

    const [
      totalAgendamentos,
      agendamentosStatus,
      agendamentosPorServico,
      agendamentosPorFuncionario
    ] = await Promise.all([
      Agendamento.countDocuments(filtros),
      Agendamento.aggregate([
        { $match: filtros },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Agendamento.aggregate([
        { $match: filtros },
        { $lookup: { from: 'servicos', localField: 'servicoId', foreignField: '_id', as: 'servico' } },
        { $unwind: '$servico' },
        { $group: { _id: '$servico.nome', count: { $sum: 1 }, receita: { $sum: '$preco' } } }
      ]),
      Agendamento.aggregate([
        { $match: filtros },
        { $lookup: { from: 'users', localField: 'funcionarioId', foreignField: '_id', as: 'funcionario' } },
        { $unwind: '$funcionario' },
        { $group: { _id: '$funcionario.nome', count: { $sum: 1 }, receita: { $sum: '$preco' } } }
      ])
    ]);

    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: {
        totalAgendamentos,
        agendamentosStatus,
        agendamentosPorServico,
        agendamentosPorFuncionario
      }
    });
  });
}

export default AgendamentoController;
