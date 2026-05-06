import twilio from 'twilio';
import logger from '../utils/logger.js';

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Inicializar cliente Twilio apenas se as credenciais existirem
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isConfigured = true;
      logger.info('TwilioService inicializado com sucesso');
    } else {
      this.client = null;
      this.isConfigured = false;
      logger.warn('TwilioService não configurado - credenciais ausentes');
    }
  }

  /**
   * Formatar número de telefone para o formato WhatsApp do Twilio
   * @param {string} phoneNumber - Número de telefone
   * @returns {string} - Número formatado (whatsapp:+55...)
   */
  formatWhatsAppNumber(phoneNumber) {
    // Remove caracteres não numéricos
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Se não começar com 55 (código do Brasil), adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return `whatsapp:+${cleaned}`;
  }

  /**
   * Enviar mensagem via WhatsApp
   * @param {string} to - Número de destino
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<object>} - Resultado do envio
   */
  async sendMessage(to, message) {
    if (!this.isConfigured) {
      logger.warn('Tentativa de envio sem configuração do Twilio');
      return {
        success: false,
        error: 'Twilio não configurado',
        simulated: true,
        message
      };
    }

    try {
      const formattedTo = this.formatWhatsAppNumber(to);
      const formattedFrom = `whatsapp:${this.whatsappNumber}`;

      const result = await this.client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo
      });

      logger.info('Mensagem WhatsApp enviada', {
        sid: result.sid,
        to: formattedTo,
        status: result.status
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: formattedTo
      };
    } catch (error) {
      logger.error('Erro ao enviar mensagem WhatsApp', {
        error: error.message,
        to,
        code: error.code
      });

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Enviar mensagem com lista de opções numeradas
   * @param {string} to - Número de destino
   * @param {string} header - Texto de cabeçalho
   * @param {Array<{numero: number, texto: string}>} options - Opções numeradas
   * @param {string} footer - Texto de rodapé (opcional)
   * @returns {Promise<object>}
   */
  async sendOptionsMessage(to, header, options, footer = '') {
    const optionsText = options
      .map((opt, index) => `${index + 1}. ${opt.texto}`)
      .join('\n');

    let message = `${header}\n\n${optionsText}`;

    if (footer) {
      message += `\n\n${footer}`;
    }

    return this.sendMessage(to, message);
  }

  /**
   * Validar assinatura do webhook Twilio
   * @param {string} signature - Assinatura X-Twilio-Signature
   * @param {string} url - URL do webhook
   * @param {object} params - Parâmetros do POST
   * @returns {boolean}
   */
  validateWebhookSignature(signature, url, params) {
    if (!this.isConfigured) {
      return true; // Em modo simulação, aceita todas
    }

    return twilio.validateRequest(
      this.authToken,
      signature,
      url,
      params
    );
  }

  /**
   * Gerar resposta TwiML para webhook
   * @param {string} message - Mensagem de resposta
   * @returns {string} - XML TwiML
   */
  generateTwiMLResponse(message) {
    const MessagingResponse = twilio.twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    twiml.message(message);
    return twiml.toString();
  }
}

// Exportar instância única (Singleton)
const twilioService = new TwilioService();
export default twilioService;
