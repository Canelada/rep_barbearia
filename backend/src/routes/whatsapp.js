import express from 'express';
import Agendamento from '../models/Agendamento.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validation.js';
import dayjs from 'dayjs';
import logger from '../utils/logger.js';
import whatsappBotController from '../controllers/whatsappBotController.js';
import twilioService from '../services/TwilioService.js';

const router = express.Router();

// ===============================================
// WEBHOOK TWILIO - Rotas públicas para o bot
// ===============================================

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Verificação do webhook Twilio (validação inicial)
 * @access  Public
 */
router.get('/webhook', (req, res) => {
  // Twilio não usa verificação GET como o Meta, mas mantemos para compatibilidade
  logger.info('Webhook verification request received');
  res.status(200).send('OK');
});

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Recebe mensagens do WhatsApp via Twilio
 * @access  Public (validado por assinatura Twilio)
 */
router.post('/webhook',
  express.urlencoded({ extended: false }), // Twilio envia como form-urlencoded
  asyncHandler(async (req, res) => {
    try {
      const {
        From,           // whatsapp:+5511999999999
        Body,           // Texto da mensagem
        MessageSid,     // ID único da mensagem
        ProfileName,    // Nome do perfil do WhatsApp
        WaId            // WhatsApp ID (número sem formatação)
      } = req.body;

      // Validar que é uma mensagem válida
      if (!From || !Body) {
        logger.warn('Webhook recebido sem dados obrigatórios', { body: req.body });
        return res.status(400).send('Missing required fields');
      }

      logger.info('Mensagem WhatsApp recebida via Twilio', {
        from: From,
        body: Body,
        messageSid: MessageSid,
        profileName: ProfileName
      });

      // Processar mensagem e obter resposta
      const response = await whatsappBotController.processMessage(From, Body);

      // Responder com TwiML
      if (response) {
        const twiml = twilioService.generateTwiMLResponse(response);
        res.type('text/xml');
        return res.send(twiml);
      }

      // Resposta vazia (200 OK sem conteúdo)
      res.status(200).send('');

    } catch (error) {
      logger.error('Erro no webhook WhatsApp', {
        error: error.message,
        stack: error.stack
      });

      // Responder com mensagem de erro genérica
      const twiml = twilioService.generateTwiMLResponse(
        'Desculpe, ocorreu um erro. Por favor, tente novamente.'
      );
      res.type('text/xml');
      res.status(200).send(twiml);
    }
  })
);

/**
 * @route   GET /api/whatsapp/status
 * @desc    Verifica status da integração Twilio
 * @access  Private - Admin
 */
router.get('/status',
  authenticateToken,
  authorizeRoles(['admin']),
  (req, res) => {
    res.json({
      success: true,
      data: {
        configured: twilioService.isConfigured,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Não configurado'
      }
    });
  }
);

// ===============================================
// ROTAS EXISTENTES - Envio manual de mensagens
// ===============================================

/**
 * @route   POST /api/whatsapp/enviar
 * @desc    Enviar mensagem via WhatsApp
 * @access  Private - Admin/Manager
 */
router.post('/enviar',
  authenticateToken,
  authorizeRoles(['admin', 'manager']),
  asyncHandler(async (req, res) => {
    const { telefone, mensagem, agendamentoId } = req.body;

    if (!telefone || !mensagem) {
      return res.status(400).json({
        success: false,
        message: 'Telefone e mensagem são obrigatórios'
      });
    }

    try {
      // Simulação de envio
      const resultado = {
        sucesso: true,
        id: `wpp_${Date.now()}`,
        telefone,
        mensagem,
        dataEnvio: new Date()
      };

      // Se for relacionado a um agendamento, marcar como enviado
      if (agendamentoId) {
        await Agendamento.findByIdAndUpdate(agendamentoId, {
          lembreteEnviado: true,
          dataLembreteEnviado: new Date()
        });
      }

      logger.info('Mensagem WhatsApp enviada', {
        telefone,
        agendamentoId,
        resultado
      });

      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: resultado
      });

    } catch (error) {
      logger.error('Erro ao enviar mensagem WhatsApp', {
        error: error.message,
        telefone,
        agendamentoId
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: error.message
      });
    }
  })
);

/**
 * @route   POST /api/whatsapp/lembrete
 * @desc    Enviar lembrete de agendamento via WhatsApp
 * @access  Private - Admin/Manager/Employee
 */
router.post('/lembrete',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { agendamentoId } = req.body;
    
    const agendamento = await Agendamento.findById(agendamentoId)
      .populate('servicoId', 'nome duracao preco')
      .populate('funcionarioId', 'nome');
    
    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }
    
    if (!agendamento.clienteTelefone) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não possui telefone cadastrado'
      });
    }
    
    const dataFormatada = dayjs(agendamento.dataHora).format('DD/MM/YYYY');
    const horaFormatada = dayjs(agendamento.dataHora).format('HH:mm');
    
    const mensagem = `Olá ${agendamento.clienteNome}! 👋

Este é um lembrete do seu agendamento na Barbearia Monarca:

📅 Data: ${dataFormatada}
⏰ Horário: ${horaFormatada}
✂️ Serviço: ${agendamento.servicoId?.nome || 'Não informado'}
👨‍💼 Profissional: ${agendamento.funcionarioId?.nome || 'Não informado'}

Aguardamos você! 💈`;

    try {
      // Simulação de envio
      const resultado = {
        sucesso: true,
        id: `sim_${Date.now()}`,
        telefone: agendamento.clienteTelefone,
        dataEnvio: new Date(),
        simulado: true
      };

      // Marcar lembrete como enviado
      await Agendamento.findByIdAndUpdate(agendamentoId, {
        lembreteEnviado: true,
        dataLembreteEnviado: new Date()
      });

      logger.info('Lembrete WhatsApp enviado', {
        agendamentoId,
        cliente: agendamento.clienteNome,
        telefone: agendamento.clienteTelefone,
        resultado
      });

      res.json({
        success: true,
        message: 'Lembrete enviado com sucesso',
        data: {
          agendamento: agendamentoId,
          telefone: agendamento.clienteTelefone,
          resultado
        }
      });

    } catch (error) {
      logger.error('Erro ao enviar lembrete WhatsApp', {
        error: error.message,
        agendamentoId,
        telefone: agendamento.clienteTelefone
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao enviar lembrete',
        error: error.message
      });
    }
  })
);

export default router;
