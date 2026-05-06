/**
 * AuditLog Model
 * Armazena logs de auditoria de todas as operações do sistema.
 * Possui TTL de 365 dias para exclusão automática de registros antigos.
 */
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    acao: {
      type: String,
      required: true,
      enum: ['criar', 'atualizar', 'excluir', 'login', 'logout', 'status', 'movimentar'],
    },
    entidade: {
      type: String,
      required: true,
      enum: ['usuario', 'agendamento', 'servico', 'cliente', 'produto', 'caixa', 'auth'],
    },
    entidadeId: { type: mongoose.Schema.Types.ObjectId },
    entidadeNome: { type: String, maxLength: 200 },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usuarioNome: { type: String, maxLength: 100 },
    dadosAnteriores: { type: mongoose.Schema.Types.Mixed },
    dadosNovos: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    detalhes: { type: String, maxLength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entidade: 1, createdAt: -1 });
auditLogSchema.index({ usuarioId: 1, createdAt: -1 });
auditLogSchema.index({ acao: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // TTL 1 ano

export default mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
