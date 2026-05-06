import mongoose from 'mongoose';

const agendamentoSchema = new mongoose.Schema({
  clienteNome: {
    type: String,
    required: [true, 'Nome do cliente é obrigatório'],
    trim: true,
    maxLength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  clienteTelefone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[\d\s\(\)\-\+]+$/.test(v);
      },
      message: 'Telefone deve conter apenas números e caracteres especiais válidos'
    }
  },
  clienteEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email deve ter um formato válido'
    }
  },
  servicos: [{
    servicoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Servico',
      required: [true, 'Serviço é obrigatório']
    },
    preco: {
      type: Number,
      required: true,
      min: [0, 'Preço deve ser positivo']
    },
    comissao: {
      type: Number,
      default: 0,
      min: [0, 'Comissão deve ser positiva'],
      max: [100, 'Comissão não pode ser maior que 100%']
    }
  }],
  // Manter compatibilidade com agendamentos antigos
  servicoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Servico'
  },
  funcionarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Funcionário é obrigatório']
  },
  dataHora: {
    type: Date,
    required: [true, 'Data e hora são obrigatórias'],
    validate: {
      validator: function(v) {
        // Se é um documento novo (criação), a data deve ser futura
        if (this.isNew) {
          return v > new Date();
        }
        // Se está editando, permitir qualquer data
        // (a validação de data futura será feita apenas se o admin estiver alterando a data)
        return true;
      },
      message: 'Data do agendamento deve ser futura'
    }
  },
  status: {
    type: String,
    enum: ['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'nao_compareceu'],
    default: 'agendado'
  },
  observacoes: {
    type: String,
    trim: true,
    maxLength: [500, 'Observações devem ter no máximo 500 caracteres']
  },
  preco: {
    type: Number,
    min: [0, 'Preço deve ser positivo']
  },
  comissao: {
    type: Number,
    default: 0,
    min: [0, 'Comissão deve ser positiva'],
    max: [100, 'Comissão não pode ser maior que 100%']
  },
  desconto: {
    type: Number,
    default: 0,
    min: [0, 'Desconto deve ser positivo'],
    max: [100, 'Desconto máximo é 100%']
  },
  metodoPagamento: {
    type: String,
    enum: ['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'outros']
  },
  origem: {
    type: String,
    enum: ['presencial', 'whatsapp', 'site', 'telefone'],
    default: 'presencial'
  },
  lembreteEnviado: {
    type: Boolean,
    default: false
  },
  motivoCancelamento: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices
agendamentoSchema.index({ dataHora: 1 });
agendamentoSchema.index({ funcionarioId: 1, dataHora: 1 });
agendamentoSchema.index({ status: 1 });
agendamentoSchema.index({ clienteTelefone: 1 });

// Virtual para preço final
agendamentoSchema.virtual('precoFinal').get(function() {
  let precoTotal = 0;
  
  // Novo formato com múltiplos serviços
  if (this.servicos && this.servicos.length > 0) {
    precoTotal = this.servicos.reduce((total, servico) => total + (servico.preco || 0), 0);
  } 
  // Compatibilidade com formato antigo
  else if (this.preco) {
    precoTotal = this.preco;
  }
  
  const desconto = precoTotal * (this.desconto / 100);
  return precoTotal - desconto;
});

// Virtual para preço total dos serviços
agendamentoSchema.virtual('precoTotalServicos').get(function() {
  if (this.servicos && this.servicos.length > 0) {
    return this.servicos.reduce((total, servico) => total + (servico.preco || 0), 0);
  }
  return this.preco || 0;
});

// Método para verificar se pode ser cancelado
agendamentoSchema.methods.podeSerCancelado = function() {
  const agora = new Date();
  const tempoMinimo = new Date(this.dataHora.getTime() - (60 * 60 * 1000)); // 1 hora antes
  
  return agora < tempoMinimo && ['agendado', 'confirmado'].includes(this.status);
};

// Método para cancelar agendamento
agendamentoSchema.methods.cancelar = function(motivo = '') {
  if (!this.podeSerCancelado()) {
    throw new Error('Agendamento não pode ser cancelado');
  }
  
  this.status = 'cancelado';
  this.motivoCancelamento = motivo;
  return this.save();
};

export default mongoose.model('Agendamento', agendamentoSchema);
