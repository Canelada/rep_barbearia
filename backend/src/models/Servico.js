import mongoose from 'mongoose';

const servicoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome do serviço é obrigatório'],
    trim: true,
    maxLength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxLength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  duracaoMin: {
    type: Number,
    required: [true, 'Duração em minutos é obrigatória'],
    min: [5, 'Duração mínima é 5 minutos'],
    max: [480, 'Duração máxima é 8 horas']
  },
  preco: {
    type: Number,
    required: [true, 'Preço é obrigatório'],
    min: [0, 'Preço deve ser positivo']
  },
  comissao: {
    type: Number,
    default: 0,
    min: [0, 'Comissão deve ser positiva'],
    max: [100, 'Comissão não pode ser maior que 100%']
  },
  categoria: {
    type: String,
    enum: ['Corte Masculino', 'Barba', 'Combo', 'Infantil', 'Tratamento', 'Especial', 'Outros'],
    default: 'Outros'
  },
  ativo: {
    type: Boolean,
    default: true
  },
  permiteAgendamento: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
servicoSchema.index({ nome: 1 });
servicoSchema.index({ categoria: 1 });
servicoSchema.index({ ativo: 1 });

// Virtual para formatação do preço
servicoSchema.virtual('precoFormatado').get(function() {
  return `R$ ${this.preco.toFixed(2).replace('.', ',')}`;
});

// Método para calcular preço com desconto
servicoSchema.methods.calcularPrecoComDesconto = function(percentualDesconto = 0) {
  const desconto = this.preco * (percentualDesconto / 100);
  return this.preco - desconto;
};

export default mongoose.model('Servico', servicoSchema);
