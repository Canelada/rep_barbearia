import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: [50, 'Nome da categoria deve ter no máximo 50 caracteres'],
    validate: {
      validator: function(v) {
        // Permitir apenas letras, números, espaços, hífens e acentos
        return /^[a-zA-Z0-9\s\-\+áéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]+$/.test(v);
      },
      message: 'Nome da categoria contém caracteres inválidos'
    }
  },
  ativa: {
    type: Boolean,
    default: true
  },
  ordem: {
    type: Number,
    default: 0
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices
categoriaSchema.index({ ativa: 1 });
categoriaSchema.index({ ordem: 1 });

// Método para obter todas as categorias (padrão + personalizadas)
categoriaSchema.statics.obterTodasCategorias = async function() {
  // Categorias padrão do sistema
  const categoriasDefault = [
    'Corte Masculino',
    'Barba', 
    'Combo',
    'Tratamento',
    'Infantil',
    'Especial'
  ];

  // Buscar categorias personalizadas ativas
  const categoriasPersonalizadas = await this.find({ ativa: true })
    .sort({ ordem: 1, nome: 1 })
    .lean();

  // Combinar e remover duplicatas
  const todasCategorias = [
    ...categoriasDefault,
    ...categoriasPersonalizadas.map(cat => cat.nome)
  ];

  return [...new Set(todasCategorias)].sort();
};

export default mongoose.model('Categoria', categoriaSchema);
