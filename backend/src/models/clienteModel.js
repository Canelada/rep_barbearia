import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxLength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  telefone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true,
    match: [/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Formato de telefone inválido']
  },
  cpf: {
    type: String,
    trim: true,
  },
  cnpj: {
    type: String,
    trim: true,
  },
  dataAniversario: {
    type: String,
    trim: true,
    match: [/^\d{2}\/\d{2}$/, 'Formato de data de aniversário inválido (DD/MM)']
  },
  servicoPreferido: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Servico'
  },
  observacoes: {
    type: String,
    trim: true,
    maxLength: [500, 'Observações devem ter no máximo 500 caracteres']
  },
  ativo: {
    type: Boolean,
    default: true
  },
  assinante: {
    type: Boolean,
    default: false
  },
  ultimoAgendamento: {
    type: Date
  },
  totalAgendamentos: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
clienteSchema.index({ nome: 1 });
clienteSchema.index({ telefone: 1 });
clienteSchema.index({ dataAniversario: 1 });

clienteSchema.virtual('servicoPreferidoNome', {
  ref: 'Servico',
  localField: 'servicoPreferido',
  foreignField: '_id',
  justOne: true,
  options: { select: 'nome' }
});

clienteSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'servicoPreferido',
    select: 'nome categoria'
  });
  next();
});

clienteSchema.methods.isAniversarioHoje = function() {
  if (!this.dataAniversario) return false;
  
  const hoje = new Date();
  const hojeDM = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  
  return this.dataAniversario === hojeDM;
};

clienteSchema.methods.atualizarEstatisticas = async function() {
  return this;
};

export default mongoose.model('Cliente', clienteSchema);
