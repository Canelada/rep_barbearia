import mongoose from 'mongoose';

const pagamentoComissaoSchema = new mongoose.Schema({
  funcionarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Funcionário é obrigatório']
  },
  periodo: {
    inicio: {
      type: Date,
      required: [true, 'Data de início do período é obrigatória']
    },
    fim: {
      type: Date,
      required: [true, 'Data de fim do período é obrigatória']
    }
  },
  valorComissao: {
    type: Number,
    required: [true, 'Valor da comissão é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  valorPago: {
    type: Number,
    required: [true, 'Valor pago é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  dataPagamento: {
    type: Date,
    default: Date.now,
    required: true
  },
  metodoPagamento: {
    type: String,
    enum: ['dinheiro', 'pix', 'transferencia', 'outro'],
    default: 'dinheiro',
    required: true
  },
  observacoes: {
    type: String,
    trim: true,
    maxLength: [500, 'Observações devem ter no máximo 500 caracteres']
  },
  pagoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário que realizou o pagamento é obrigatório']
  },
  agendamentosIncluidos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agendamento'
  }],
  caixaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caixa'
  },
  status: {
    type: String,
    enum: ['pago', 'parcial', 'cancelado'],
    default: 'pago'
  }
}, {
  timestamps: true
});

// Índices para performance
pagamentoComissaoSchema.index({ funcionarioId: 1, dataPagamento: -1 });
pagamentoComissaoSchema.index({ dataPagamento: -1 });
pagamentoComissaoSchema.index({ status: 1 });

// Virtual para verificar se é pagamento parcial
pagamentoComissaoSchema.virtual('isParcial').get(function() {
  return this.valorPago < this.valorComissao;
});

// Virtual para valor restante
pagamentoComissaoSchema.virtual('valorRestante').get(function() {
  return Math.max(0, this.valorComissao - this.valorPago);
});

export default mongoose.model('PagamentoComissao', pagamentoComissaoSchema);
