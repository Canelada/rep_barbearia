import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxLength: [100, 'Nome deve ter no máximo 100 caracteres'],
    },
    telefone: {
      type: String,
      trim: true,
    },
    email: {
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
    cpf: {
      type: String,
      trim: true,
    },
    cnpj: {
      type: String,
      trim: true,
    },
    endereco: {
      type: String,
      trim: true,
    },
    observacoes: {
      type: String,
      trim: true,
      maxLength: [500, 'Observações devem ter no máximo 500 caracteres']
    },
    usuario: {
      type: String,
      required: [true, 'Usuário é obrigatório'],
      unique: true,
      trim: true,
      lowercase: true,
      minLength: [3, 'Usuário deve ter pelo menos 3 caracteres'],
      maxLength: [50, 'Usuário deve ter no máximo 50 caracteres'],
    },
    senhaHash: {
      type: String,
      required: [true, 'Senha é obrigatória'],
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'funcionario', 'barbeiro'], // Unificando roles
      default: 'funcionario',
    },
    comissao: {
      type: Number,
      default: 0,
    }, // Percentual de comissão
    ativo: {
      type: Boolean,
      default: true,
    },
    ultimoLogin: {
      type: Date,
    },
    dataAdmissao: {
      type: Date,
      default: Date.now,
    },
    horarioTrabalho: {
      segunda: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '18:00' }
      },
      terca: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '18:00' }
      },
      quarta: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '18:00' }
      },
      quinta: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '18:00' }
      },
      sexta: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '18:00' }
      },
      sabado: {
        ativo: { type: Boolean, default: true },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '16:00' }
      },
      domingo: {
        ativo: { type: Boolean, default: false },
        inicio: { type: String, default: '08:00' },
        fim: { type: String, default: '16:00' }
      }
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.senhaHash;
        return ret;
      },
    },
  }
);

// Índices para performance (usuario já tem índice pelo unique: true)
userSchema.index({ role: 1 });
userSchema.index({ ativo: 1 });

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('senhaHash')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.senhaHash = await bcrypt.hash(this.senhaHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para verificar senha
userSchema.methods.verificarSenha = async function (senha) {
  return bcrypt.compare(senha, this.senhaHash);
};

// Método para comparar senhas (compatibilidade)
userSchema.methods.compararSenha = async function (senha) {
  return bcrypt.compare(senha, this.senhaHash);
};

// Método para atualizar último login
userSchema.methods.atualizarUltimoLogin = async function () {
  this.ultimoLogin = new Date();
  return this.save();
};

export default mongoose.models.User ||
  mongoose.model('User', userSchema, 'users');
