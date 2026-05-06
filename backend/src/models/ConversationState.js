import mongoose from 'mongoose';

/**
 * Estados possíveis do fluxo de conversa do WhatsApp Bot
 */
export const CONVERSATION_STATES = {
  WELCOME: 'welcome',
  WAITING_NAME: 'waiting_name',
  MENU_PRINCIPAL: 'menu_principal',
  CHOOSING_SERVICE: 'choosing_service',
  CHOOSING_PROFESSIONAL: 'choosing_professional',
  CHOOSING_DATE: 'choosing_date',
  CHOOSING_TIME: 'choosing_time',
  CONFIRMING: 'confirming',
  COMPLETED: 'completed'
};

const conversationStateSchema = new mongoose.Schema({
  // Número de telefone do cliente (identificador único da conversa)
  phoneNumber: {
    type: String,
    required: [true, 'Número de telefone é obrigatório'],
    unique: true,
    index: true
  },

  // Estado atual da conversa
  currentState: {
    type: String,
    enum: Object.values(CONVERSATION_STATES),
    default: CONVERSATION_STATES.WELCOME
  },

  // Dados coletados durante a conversa
  collectedData: {
    clienteNome: { type: String },
    servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico' },
    servicoNome: { type: String },
    servicoPreco: { type: Number },
    servicoDuracao: { type: Number },
    funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    funcionarioNome: { type: String },
    dataEscolhida: { type: String }, // Formato: YYYY-MM-DD
    horaEscolhida: { type: String }, // Formato: HH:mm
    dataHora: { type: Date }
  },

  // Lista de serviços disponíveis (cache para não precisar buscar novamente)
  availableServices: [{
    id: { type: mongoose.Schema.Types.ObjectId },
    nome: { type: String },
    preco: { type: Number },
    duracao: { type: Number }
  }],

  // Lista de profissionais disponíveis (cache)
  availableProfessionals: [{
    id: { type: mongoose.Schema.Types.ObjectId },
    nome: { type: String }
  }],

  // Lista de horários disponíveis (cache)
  availableTimes: [{ type: String }],

  // Última mensagem enviada pelo bot (para evitar duplicações)
  lastBotMessage: { type: String },

  // Última interação do cliente
  lastInteraction: {
    type: Date,
    default: Date.now
  },

  // Número de tentativas inválidas consecutivas
  invalidAttempts: {
    type: Number,
    default: 0
  },

  // Se a conversa está ativa
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para limpar conversas antigas (TTL de 24 horas sem interação)
conversationStateSchema.index(
  { lastInteraction: 1 },
  { expireAfterSeconds: 86400 } // 24 horas
);

// Método para resetar a conversa
conversationStateSchema.methods.reset = function() {
  this.currentState = CONVERSATION_STATES.WELCOME;
  this.collectedData = {};
  this.availableServices = [];
  this.availableProfessionals = [];
  this.availableTimes = [];
  this.invalidAttempts = 0;
  this.lastInteraction = new Date();
  return this.save();
};

// Método para atualizar estado
conversationStateSchema.methods.updateState = function(newState, data = {}) {
  this.currentState = newState;
  this.collectedData = { ...this.collectedData, ...data };
  this.lastInteraction = new Date();
  this.invalidAttempts = 0;
  return this.save();
};

// Método para incrementar tentativas inválidas
conversationStateSchema.methods.incrementInvalidAttempts = function() {
  this.invalidAttempts += 1;
  this.lastInteraction = new Date();
  return this.save();
};

// Método estático para buscar ou criar conversa
conversationStateSchema.statics.findOrCreate = async function(phoneNumber) {
  let conversation = await this.findOne({ phoneNumber });

  if (!conversation) {
    conversation = await this.create({ phoneNumber });
  } else {
    // Atualizar última interação
    conversation.lastInteraction = new Date();
    await conversation.save();
  }

  return conversation;
};

const ConversationState = mongoose.model('ConversationState', conversationStateSchema);

export default ConversationState;
