import mongoose from 'mongoose';

const movimentacaoEstoqueSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['entrada', 'saida', 'ajuste'],
    required: [true, 'Tipo de movimentação é obrigatório']
  },
  quantidade: {
    type: Number,
    required: [true, 'Quantidade é obrigatória']
  },
  motivo: {
    type: String,
    required: [true, 'Motivo é obrigatório'],
    trim: true,
    maxLength: [200, 'Motivo deve ter no máximo 200 caracteres']
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  data: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const produtoSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome do produto é obrigatório'],
      trim: true,
      maxLength: [100, 'Nome deve ter no máximo 100 caracteres'],
    },
    categoria: {
      type: String,
      required: [true, 'Categoria é obrigatória'],
      trim: true,
      maxLength: [50, 'Categoria deve ter no máximo 50 caracteres'],
    },
    quantidade: {
      type: Number,
      required: [true, 'Quantidade é obrigatória'],
      min: [0, 'Quantidade não pode ser negativa'],
      default: 0,
    },
    quantidadeMinima: {
      type: Number,
      required: [true, 'Quantidade mínima é obrigatória'],
      min: [0, 'Quantidade mínima não pode ser negativa'],
      default: 1,
    },
    unidade: {
      type: String,
      required: [true, 'Unidade é obrigatória'],
      enum: ['unidade', 'unid', 'ml', 'l', 'g', 'kg', 'caixa', 'pacote'],
      default: 'unidade',
    },
    preco: {
      type: Number,
      min: [0, 'Preço deve ser positivo'],
    },
    valorCompra: {
      type: Number,
      min: [0, 'Valor de compra deve ser positivo'],
      default: 0,
    },
    valorVenda: {
      type: Number,
      min: [0, 'Valor de venda deve ser positivo'],
      default: 0,
    },
    comissao: {
      type: Number,
      min: [0, 'Comissão deve ser positiva'],
      max: [100, 'Comissão não pode ser maior que 100%'],
      default: 0,
    },
    fornecedor: {
      type: String,
      trim: true,
      maxLength: [100, 'Fornecedor deve ter no máximo 100 caracteres'],
    },
    codigoBarras: {
      type: String,
      trim: true,
      sparse: true, // Permite valores únicos ou null
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    movimentacoes: [movimentacaoEstoqueSchema],
  },
  {
    timestamps: true,
  }
);

// Índices
produtoSchema.index({ nome: 1 });
produtoSchema.index({ categoria: 1 });
produtoSchema.index({ ativo: 1 });

// Virtual para verificar se está em falta
produtoSchema.virtual('emFalta').get(function() {
  return this.quantidade <= this.quantidadeMinima;
});

// Virtual para status do estoque
produtoSchema.virtual('statusEstoque').get(function() {
  if (this.quantidade === 0) return 'zerado';
  if (this.quantidade <= this.quantidadeMinima) return 'baixo';
  if (this.quantidade <= this.quantidadeMinima * 2) return 'medio';
  return 'alto';
});

// Método para movimentar estoque
produtoSchema.methods.movimentar = function(tipo, quantidade, motivo, usuarioId) {
  if (tipo === 'saida' && quantidade > this.quantidade) {
    throw new Error('Quantidade insuficiente em estoque');
  }

  const movimentacao = {
    tipo,
    quantidade,
    motivo,
    usuarioId,
    data: new Date()
  };

  this.movimentacoes.push(movimentacao);

  switch (tipo) {
    case 'entrada':
      this.quantidade += quantidade;
      break;
    case 'saida':
      this.quantidade -= quantidade;
      break;
    case 'ajuste':
      this.quantidade = quantidade;
      break;
  }

  return this.save();
};

// Método para verificar necessidade de reposição
produtoSchema.methods.precisaReposicao = function() {
  return this.quantidade <= this.quantidadeMinima;
};

export default mongoose.model('Produto', produtoSchema);
