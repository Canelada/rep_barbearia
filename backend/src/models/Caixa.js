import mongoose from 'mongoose';

const movimentacaoSchema = new mongoose.Schema({
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório']
  },
  descricao: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true,
    maxLength: [200, 'Descrição deve ter no máximo 200 caracteres']
  },
  categoria: {
    type: String,
    trim: true,
    maxLength: [50, 'Categoria deve ter no máximo 50 caracteres']
  },
  hora: {
    type: String,
    default: () => new Date().toLocaleTimeString('pt-BR')
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agendamentoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agendamento'
  }
}, { _id: false });

const caixaSchema = new mongoose.Schema({
  data: {
    type: String,
    required: [true, 'Data é obrigatória'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Data deve estar no formato YYYY-MM-DD'
    }
  },
  entradas: [movimentacaoSchema],
  saidas: [movimentacaoSchema],
  saldoInicial: {
    type: Number,
    default: 0
  },
  saldoFinal: {
    type: Number,
    default: 0
  },
  aberto: {
    type: Boolean,
    default: false
  },
  abertoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataAbertura: {
    type: Date
  },
  fechado: {
    type: Boolean,
    default: false
  },
  fechadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataFechamento: {
    type: Date
  },
  observacoes: {
    type: String,
    trim: true,
    maxLength: [500, 'Observações devem ter no máximo 500 caracteres']
  }
}, {
  timestamps: true
});

// Índices
caixaSchema.index({ fechado: 1 });
caixaSchema.index({ aberto: 1 });
caixaSchema.index({ data: 1, aberto: 1 });

// Virtual para total de entradas
caixaSchema.virtual('totalEntradas').get(function() {
  return this.entradas.reduce((total, entrada) => total + entrada.valor, 0);
});

// Virtual para total de saídas
caixaSchema.virtual('totalSaidas').get(function() {
  return this.saidas.reduce((total, saida) => total + saida.valor, 0);
});

// Virtual para saldo do dia
caixaSchema.virtual('saldoDia').get(function() {
  return this.totalEntradas - this.totalSaidas;
});

// Método para adicionar entrada
caixaSchema.methods.adicionarEntrada = function(dadosEntrada) {
  if (!this.podeReceberMovimentacoes()) {
    throw new Error('Caixa deve estar aberto para receber movimentações');
  }
  this.entradas.push(dadosEntrada);
  this.atualizarSaldoFinal();
  return this.save();
};

// Método para adicionar saída
caixaSchema.methods.adicionarSaida = function(dadosSaida) {
  if (!this.podeReceberMovimentacoes()) {
    throw new Error('Caixa deve estar aberto para receber movimentações');
  }
  this.saidas.push(dadosSaida);
  this.atualizarSaldoFinal();
  return this.save();
};

// Método para atualizar saldo final
caixaSchema.methods.atualizarSaldoFinal = function() {
  this.saldoFinal = this.saldoInicial + this.saldoDia;
};

// Método para abrir caixa
caixaSchema.methods.abrirCaixa = function(usuarioId, saldoInicial = 0) {
  if (this.aberto) {
    throw new Error('Caixa já está aberto');
  }
  if (this.fechado) {
    throw new Error('Caixa já foi fechado e não pode ser reaberto');
  }

  this.aberto = true;
  this.abertoPor = usuarioId;
  this.dataAbertura = new Date();
  this.saldoInicial = saldoInicial;
  this.atualizarSaldoFinal();

  return this.save();
};

// Método para fechar caixa
caixaSchema.methods.fecharCaixa = function(usuarioId) {
  if (this.fechado) {
    throw new Error('Caixa já está fechado');
  }
  if (!this.aberto) {
    throw new Error('Caixa deve estar aberto para ser fechado');
  }

  this.fechado = true;
  this.fechadoPor = usuarioId;
  this.dataFechamento = new Date();
  this.atualizarSaldoFinal();

  return this.save();
};

// Método para verificar se pode receber movimentações
caixaSchema.methods.podeReceberMovimentacoes = function() {
  return this.aberto && !this.fechado;
};

export default mongoose.model('Caixa', caixaSchema);
