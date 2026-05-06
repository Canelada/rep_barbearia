/* eslint-disable no-case-declarations */
import ConversationState, { CONVERSATION_STATES } from '../models/ConversationState.js';
import Servico from '../models/Servico.js';
import User from '../models/userModel.js';
import Agendamento from '../models/Agendamento.js';
import Cliente from '../models/clienteModel.js';
import { AgendamentoService } from '../services/AgendamentoService.js';
import twilioService from '../services/TwilioService.js';
import logger from '../utils/logger.js';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';

dayjs.locale('pt-br');

// Nome da barbearia (pode vir de config/env)
const NOME_BARBEARIA = process.env.NOME_BARBEARIA || 'Barbearia';

/**
 * Mensagens do bot
 */
const MESSAGES = {
  WELCOME: `Olá! Bem-vindo à ${NOME_BARBEARIA}! 💈

Sou o assistente virtual e vou te ajudar a fazer um agendamento.

Para começar, qual é o seu nome?`,

  INVALID_NAME: `Desculpe, não entendi seu nome. Por favor, digite apenas seu nome (ex: João Silva):`,

  MENU_PRINCIPAL: (nome) => `Prazer em conhecê-lo(a), ${nome}! 😊

O que você gostaria de fazer?

1. Agendar um serviço
2. Ver meus agendamentos
3. Cancelar agendamento
0. Sair`,

  CHOOSE_SERVICE: (nome, servicos) => {
    const listaServicos = servicos
      .map((s, i) => `${i + 1}. ${s.nome} - R$ ${s.preco.toFixed(2)} (${s.duracao} min)`)
      .join('\n');

    return `${nome}, escolha o serviço desejado:

${listaServicos}

0. Voltar ao menu`;
  },

  CHOOSE_PROFESSIONAL: (profissionais) => {
    const listaProfissionais = profissionais
      .map((p, i) => `${i + 1}. ${p.nome}`)
      .join('\n');

    return `Ótima escolha! Agora escolha o profissional:

${listaProfissionais}

0. Voltar`;
  },

  CHOOSE_DATE: `Quando você gostaria de agendar?

Envie a data no formato DD/MM (ex: 28/01)
Ou digite:
- "hoje" para hoje
- "amanha" para amanhã

0. Voltar`,

  NO_TIMES_AVAILABLE: `Infelizmente não há horários disponíveis para esta data. 😔

Por favor, escolha outra data ou digite 0 para voltar.`,

  CHOOSE_TIME: (data, horarios) => {
    const listaHorarios = horarios
      .map((h, i) => `${i + 1}. ${h}`)
      .join('\n');

    return `Horários disponíveis para ${data}:

${listaHorarios}

0. Voltar`;
  },

  CONFIRMATION: (dados) => `📋 *Confirme seu agendamento:*

👤 Cliente: ${dados.clienteNome}
✂️ Serviço: ${dados.servicoNome}
👨‍💼 Profissional: ${dados.funcionarioNome}
📅 Data: ${dados.dataFormatada}
⏰ Horário: ${dados.horaEscolhida}
💰 Valor: R$ ${dados.servicoPreco.toFixed(2)}

1. Confirmar ✅
2. Cancelar ❌`,

  SUCCESS: (dados) => `🎉 *Agendamento confirmado com sucesso!*

📅 ${dados.dataFormatada} às ${dados.horaEscolhida}
✂️ ${dados.servicoNome}
👨‍💼 ${dados.funcionarioNome}

Aguardamos você! 💈

Digite qualquer mensagem para fazer um novo agendamento.`,

  CANCELLED: `Agendamento cancelado.

Digite qualquer mensagem para recomeçar.`,

  HORARIO_OCUPADO: (funcionarioNome, horariosAlternativos) => {
    const listaHorarios = horariosAlternativos
      .map((h, i) => `${i + 1}. ${h}`)
      .join('\n');

    return `⚠️ *Horário indisponível!*

O profissional ${funcionarioNome} já possui um agendamento neste horário.

*Horários disponíveis próximos:*
${listaHorarios}

Escolha um dos horários acima ou digite 0 para escolher outra data.`;
  },

  SEM_HORARIOS_ALTERNATIVOS: (funcionarioNome) => `⚠️ *Horário indisponível!*

O profissional ${funcionarioNome} já possui um agendamento neste horário e não há mais horários disponíveis para esta data.

Digite 0 para escolher outra data.`,

  ERROR: `Desculpe, ocorreu um erro. Por favor, tente novamente.

Digite qualquer mensagem para recomeçar.`,

  INVALID_OPTION: `Opção inválida. Por favor, escolha uma das opções listadas.`,

  MAX_INVALID_ATTEMPTS: `Você excedeu o número máximo de tentativas. A conversa será reiniciada.

Digite qualquer mensagem para começar novamente.`,

  GOODBYE: `Obrigado por usar nosso serviço! 👋

Até a próxima! 💈`,

  NO_APPOINTMENTS: `Você não possui agendamentos futuros.

Digite qualquer mensagem para fazer um novo agendamento.`,

  MY_APPOINTMENTS: (agendamentos) => {
    const lista = agendamentos
      .map((a, i) => `${i + 1}. ${dayjs(a.dataHora).format('DD/MM [às] HH:mm')} - ${a.servicoNome || 'Serviço'}`)
      .join('\n');

    return `📋 *Seus próximos agendamentos:*

${lista}

Digite qualquer mensagem para voltar ao menu.`;
  }
};

/**
 * Controller principal do bot de WhatsApp
 */
class WhatsAppBotController {
  /**
   * Processa mensagem recebida do webhook
   */
  async processMessage(from, body) {
    try {
      // Normalizar número de telefone
      const phoneNumber = this.normalizePhoneNumber(from);
      const message = body.trim().toLowerCase();

      // Buscar ou criar estado da conversa
      const conversation = await ConversationState.findOrCreate(phoneNumber);

      logger.info('Mensagem recebida', {
        from: phoneNumber,
        message: body,
        currentState: conversation.currentState
      });

      // Processar mensagem baseado no estado atual
      const response = await this.handleState(conversation, message, body);

      // Enviar resposta
      if (response) {
        await twilioService.sendMessage(phoneNumber, response);
        conversation.lastBotMessage = response;
        await conversation.save();
      }

      return response;
    } catch (error) {
      logger.error('Erro ao processar mensagem', {
        error: error.message,
        from,
        body
      });

      return MESSAGES.ERROR;
    }
  }

  /**
   * Normaliza número de telefone
   */
  normalizePhoneNumber(phone) {
    // Remove 'whatsapp:' prefix e qualquer caractere não numérico
    return phone.replace('whatsapp:', '').replace(/\D/g, '');
  }

  /**
   * Manipula estado atual da conversa
   */
  async handleState(conversation, messageLower, messageOriginal) {
    const state = conversation.currentState;

    // Comando para reiniciar conversa
    if (messageLower === 'reiniciar' || messageLower === 'reset') {
      await conversation.reset();
      return MESSAGES.WELCOME;
    }

    switch (state) {
      case CONVERSATION_STATES.WELCOME:
        return this.handleWelcome(conversation);

      case CONVERSATION_STATES.WAITING_NAME:
        return this.handleWaitingName(conversation, messageOriginal);

      case CONVERSATION_STATES.MENU_PRINCIPAL:
        return this.handleMenuPrincipal(conversation, messageLower);

      case CONVERSATION_STATES.CHOOSING_SERVICE:
        return this.handleChoosingService(conversation, messageLower);

      case CONVERSATION_STATES.CHOOSING_PROFESSIONAL:
        return this.handleChoosingProfessional(conversation, messageLower);

      case CONVERSATION_STATES.CHOOSING_DATE:
        return this.handleChoosingDate(conversation, messageLower);

      case CONVERSATION_STATES.CHOOSING_TIME:
        return this.handleChoosingTime(conversation, messageLower);

      case CONVERSATION_STATES.CONFIRMING:
        return this.handleConfirming(conversation, messageLower);

      case CONVERSATION_STATES.COMPLETED:
        // Reiniciar conversa
        await conversation.reset();
        return MESSAGES.WELCOME;

      default:
        await conversation.reset();
        return MESSAGES.WELCOME;
    }
  }

  /**
   * Estado: WELCOME - Primeira interação
   */
  async handleWelcome(conversation) {
    await conversation.updateState(CONVERSATION_STATES.WAITING_NAME);
    return MESSAGES.WELCOME;
  }

  /**
   * Estado: WAITING_NAME - Aguardando nome do cliente
   */
  async handleWaitingName(conversation, name) {
    // Validar nome (mínimo 2 caracteres, apenas letras e espaços)
    const cleanName = name.trim();
    if (cleanName.length < 2 || !/^[a-zA-ZÀ-ÿ\s]+$/.test(cleanName)) {
      await conversation.incrementInvalidAttempts();

      if (conversation.invalidAttempts >= 3) {
        await conversation.reset();
        return MESSAGES.MAX_INVALID_ATTEMPTS;
      }

      return MESSAGES.INVALID_NAME;
    }

    // Capitalizar nome
    const formattedName = cleanName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    await conversation.updateState(CONVERSATION_STATES.MENU_PRINCIPAL, {
      clienteNome: formattedName
    });

    return MESSAGES.MENU_PRINCIPAL(formattedName);
  }

  /**
   * Estado: MENU_PRINCIPAL - Menu principal
   */
  async handleMenuPrincipal(conversation, message) {
    switch (message) {
      case '1':
        // Agendar serviço - carregar serviços disponíveis
        const servicos = await Servico.find({ ativo: true, permiteAgendamento: true })
          .select('nome preco duracaoMin')
          .sort('nome');

        if (servicos.length === 0) {
          return 'Desculpe, não há serviços disponíveis no momento. Tente novamente mais tarde.';
        }

        // Salvar serviços no estado
        conversation.availableServices = servicos.map(s => ({
          id: s._id,
          nome: s.nome,
          preco: s.preco,
          duracao: s.duracaoMin
        }));

        await conversation.updateState(CONVERSATION_STATES.CHOOSING_SERVICE);

        return MESSAGES.CHOOSE_SERVICE(
          conversation.collectedData.clienteNome,
          conversation.availableServices
        );

      case '2':
        // Ver agendamentos
        const agendamentos = await Agendamento.find({
          clienteTelefone: { $regex: conversation.phoneNumber.slice(-9) },
          dataHora: { $gte: new Date() },
          status: { $in: ['agendado', 'confirmado'] }
        })
          .populate('servicoId', 'nome')
          .sort('dataHora')
          .limit(5);

        if (agendamentos.length === 0) {
          return MESSAGES.NO_APPOINTMENTS;
        }

        const agendamentosFormatados = agendamentos.map(a => ({
          ...a.toObject(),
          servicoNome: a.servicoId?.nome || 'Serviço'
        }));

        return MESSAGES.MY_APPOINTMENTS(agendamentosFormatados);

      case '3':
        // Cancelar agendamento (simplificado - pode ser expandido)
        return 'Para cancelar um agendamento, por favor entre em contato conosco pelo telefone ou visite nossa loja.';

      case '0':
        await conversation.updateState(CONVERSATION_STATES.COMPLETED);
        return MESSAGES.GOODBYE;

      default:
        return MESSAGES.INVALID_OPTION + '\n\n' + MESSAGES.MENU_PRINCIPAL(conversation.collectedData.clienteNome);
    }
  }

  /**
   * Estado: CHOOSING_SERVICE - Escolhendo serviço
   */
  async handleChoosingService(conversation, message) {
    if (message === '0') {
      await conversation.updateState(CONVERSATION_STATES.MENU_PRINCIPAL);
      return MESSAGES.MENU_PRINCIPAL(conversation.collectedData.clienteNome);
    }

    const index = parseInt(message) - 1;
    const servicos = conversation.availableServices;

    if (isNaN(index) || index < 0 || index >= servicos.length) {
      await conversation.incrementInvalidAttempts();

      if (conversation.invalidAttempts >= 3) {
        await conversation.reset();
        return MESSAGES.MAX_INVALID_ATTEMPTS;
      }

      return MESSAGES.INVALID_OPTION + '\n\n' + MESSAGES.CHOOSE_SERVICE(
        conversation.collectedData.clienteNome,
        servicos
      );
    }

    const servicoEscolhido = servicos[index];

    // Carregar profissionais disponíveis
    const profissionais = await User.find({
      ativo: true,
      role: { $in: ['barbeiro', 'funcionario'] }
    }).select('nome');

    if (profissionais.length === 0) {
      return 'Desculpe, não há profissionais disponíveis no momento.';
    }

    conversation.availableProfessionals = profissionais.map(p => ({
      id: p._id,
      nome: p.nome
    }));

    await conversation.updateState(CONVERSATION_STATES.CHOOSING_PROFESSIONAL, {
      servicoId: servicoEscolhido.id,
      servicoNome: servicoEscolhido.nome,
      servicoPreco: servicoEscolhido.preco,
      servicoDuracao: servicoEscolhido.duracao
    });

    return MESSAGES.CHOOSE_PROFESSIONAL(conversation.availableProfessionals);
  }

  /**
   * Estado: CHOOSING_PROFESSIONAL - Escolhendo profissional
   */
  async handleChoosingProfessional(conversation, message) {
    if (message === '0') {
      await conversation.updateState(CONVERSATION_STATES.CHOOSING_SERVICE);
      return MESSAGES.CHOOSE_SERVICE(
        conversation.collectedData.clienteNome,
        conversation.availableServices
      );
    }

    const index = parseInt(message) - 1;
    const profissionais = conversation.availableProfessionals;

    if (isNaN(index) || index < 0 || index >= profissionais.length) {
      await conversation.incrementInvalidAttempts();

      if (conversation.invalidAttempts >= 3) {
        await conversation.reset();
        return MESSAGES.MAX_INVALID_ATTEMPTS;
      }

      return MESSAGES.INVALID_OPTION + '\n\n' + MESSAGES.CHOOSE_PROFESSIONAL(profissionais);
    }

    const profissionalEscolhido = profissionais[index];

    await conversation.updateState(CONVERSATION_STATES.CHOOSING_DATE, {
      funcionarioId: profissionalEscolhido.id,
      funcionarioNome: profissionalEscolhido.nome
    });

    return MESSAGES.CHOOSE_DATE;
  }

  /**
   * Estado: CHOOSING_DATE - Escolhendo data
   */
  async handleChoosingDate(conversation, message) {
    if (message === '0') {
      await conversation.updateState(CONVERSATION_STATES.CHOOSING_PROFESSIONAL);
      return MESSAGES.CHOOSE_PROFESSIONAL(conversation.availableProfessionals);
    }

    let data;

    if (message === 'hoje') {
      data = dayjs();
    } else if (message === 'amanha' || message === 'amanhã') {
      data = dayjs().add(1, 'day');
    } else {
      // Tentar parsear DD/MM
      const match = message.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!match) {
        await conversation.incrementInvalidAttempts();

        if (conversation.invalidAttempts >= 3) {
          await conversation.reset();
          return MESSAGES.MAX_INVALID_ATTEMPTS;
        }

        return 'Formato de data inválido. Use DD/MM (ex: 28/01)\n\n' + MESSAGES.CHOOSE_DATE;
      }

      const [, dia, mes] = match;
      const ano = dayjs().year();
      data = dayjs(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);

      // Se a data já passou este ano, assume próximo ano
      if (data.isBefore(dayjs(), 'day')) {
        data = data.add(1, 'year');
      }
    }

    // Validar que não é uma data passada
    if (data.isBefore(dayjs(), 'day')) {
      return 'Não é possível agendar para datas passadas.\n\n' + MESSAGES.CHOOSE_DATE;
    }

    // Buscar horários disponíveis
    const dataFormatada = data.format('YYYY-MM-DD');
    const { funcionarioId, servicoId } = conversation.collectedData;

    try {
      const horariosDisponiveis = await AgendamentoService.obterHorariosDisponiveis(
        dataFormatada,
        funcionarioId,
        servicoId
      );

      if (horariosDisponiveis.length === 0) {
        return MESSAGES.NO_TIMES_AVAILABLE;
      }

      // Formatar horários para exibição
      const horariosFormatados = horariosDisponiveis.map(h =>
        dayjs(h).format('HH:mm')
      );

      conversation.availableTimes = horariosFormatados;

      await conversation.updateState(CONVERSATION_STATES.CHOOSING_TIME, {
        dataEscolhida: dataFormatada
      });

      return MESSAGES.CHOOSE_TIME(
        data.format('DD/MM/YYYY'),
        horariosFormatados
      );
    } catch (error) {
      logger.error('Erro ao buscar horários disponíveis', { error: error.message });
      return 'Erro ao buscar horários. Tente novamente.\n\n' + MESSAGES.CHOOSE_DATE;
    }
  }

  /**
   * Estado: CHOOSING_TIME - Escolhendo horário
   */
  async handleChoosingTime(conversation, message) {
    if (message === '0') {
      await conversation.updateState(CONVERSATION_STATES.CHOOSING_DATE);
      return MESSAGES.CHOOSE_DATE;
    }

    const index = parseInt(message) - 1;
    const horarios = conversation.availableTimes;

    if (isNaN(index) || index < 0 || index >= horarios.length) {
      await conversation.incrementInvalidAttempts();

      if (conversation.invalidAttempts >= 3) {
        await conversation.reset();
        return MESSAGES.MAX_INVALID_ATTEMPTS;
      }

      const data = dayjs(conversation.collectedData.dataEscolhida).format('DD/MM/YYYY');
      return MESSAGES.INVALID_OPTION + '\n\n' + MESSAGES.CHOOSE_TIME(data, horarios);
    }

    const horaEscolhida = horarios[index];
    const dataHora = dayjs(`${conversation.collectedData.dataEscolhida}T${horaEscolhida}:00`).toDate();

    await conversation.updateState(CONVERSATION_STATES.CONFIRMING, {
      horaEscolhida,
      dataHora
    });

    const dados = {
      ...conversation.collectedData,
      horaEscolhida,
      dataFormatada: dayjs(conversation.collectedData.dataEscolhida).format('DD/MM/YYYY')
    };

    return MESSAGES.CONFIRMATION(dados);
  }

  /**
   * Estado: CONFIRMING - Confirmando agendamento
   */
  async handleConfirming(conversation, message) {
    if (message === '1') {
      // Confirmar agendamento
      try {
        const {
          clienteNome,
          servicoId,
          servicoPreco,
          funcionarioId,
          funcionarioNome,
          dataHora,
          dataEscolhida
        } = conversation.collectedData;

        // VALIDAR DISPONIBILIDADE ANTES DE CRIAR
        const disponibilidade = await AgendamentoService.verificarDisponibilidade(
          dataHora,
          funcionarioId,
          servicoId
        );

        if (!disponibilidade.disponivel) {
          // Horário está ocupado - buscar horários alternativos
          logger.warn('Tentativa de agendamento em horário ocupado', {
            funcionarioId,
            dataHora,
            conflitos: disponibilidade.conflitos
          });

          // Buscar horários disponíveis para sugerir alternativas
          try {
            const horariosDisponiveis = await AgendamentoService.obterHorariosDisponiveis(
              dataEscolhida,
              funcionarioId,
              servicoId
            );

            if (horariosDisponiveis.length > 0) {
              // Formatar horários e pegar os 5 próximos
              const horariosFormatados = horariosDisponiveis
                .slice(0, 5)
                .map(h => dayjs(h).format('HH:mm'));

              // Atualizar horários disponíveis na conversa
              conversation.availableTimes = horariosFormatados;
              await conversation.updateState(CONVERSATION_STATES.CHOOSING_TIME);

              return MESSAGES.HORARIO_OCUPADO(funcionarioNome, horariosFormatados);
            } else {
              // Sem horários disponíveis para esta data
              await conversation.updateState(CONVERSATION_STATES.CHOOSING_DATE);
              return MESSAGES.SEM_HORARIOS_ALTERNATIVOS(funcionarioNome);
            }
          } catch (error) {
            logger.error('Erro ao buscar horários alternativos', { error: error.message });
            await conversation.updateState(CONVERSATION_STATES.CHOOSING_DATE);
            return MESSAGES.SEM_HORARIOS_ALTERNATIVOS(funcionarioNome);
          }
        }

        // Horário disponível - criar agendamento
        const agendamento = await Agendamento.create({
          clienteNome,
          clienteTelefone: conversation.phoneNumber,
          servicoId,
          servicos: [{
            servicoId,
            preco: servicoPreco
          }],
          funcionarioId,
          dataHora,
          preco: servicoPreco,
          status: 'agendado',
          origem: 'whatsapp'
        });

        // Tentar criar/atualizar cliente
        try {
          await Cliente.findOneAndUpdate(
            { telefone: { $regex: conversation.phoneNumber.slice(-9) } },
            {
              $set: { nome: clienteNome },
              $setOnInsert: { telefone: conversation.phoneNumber }
            },
            { upsert: true }
          );
        } catch (clienteError) {
          // Não falhar se não conseguir criar cliente
          logger.warn('Erro ao criar/atualizar cliente', { error: clienteError.message });
        }

        logger.info('Agendamento criado via WhatsApp', {
          agendamentoId: agendamento._id,
          cliente: clienteNome,
          telefone: conversation.phoneNumber
        });

        await conversation.updateState(CONVERSATION_STATES.COMPLETED);

        const dados = {
          ...conversation.collectedData,
          dataFormatada: dayjs(conversation.collectedData.dataEscolhida).format('DD/MM/YYYY')
        };

        return MESSAGES.SUCCESS(dados);

      } catch (error) {
        logger.error('Erro ao criar agendamento', { error: error.message });
        await conversation.reset();
        return MESSAGES.ERROR;
      }
    } else if (message === '2') {
      // Cancelar
      await conversation.reset();
      return MESSAGES.CANCELLED;
    } else {
      return MESSAGES.INVALID_OPTION + '\n\n1. Confirmar ✅\n2. Cancelar ❌';
    }
  }
}

export default new WhatsAppBotController();
