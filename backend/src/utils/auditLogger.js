/**
 * Audit Logger
 * Serviço centralizado para registro de logs de auditoria.
 *
 * Funções:
 * - registrarLog: Salva log de auditoria no MongoDB
 * - extrairInfoRequest: Extrai IP, userAgent e dados do usuário do request
 * - limparDadosSensiveis: Remove senhas e tokens antes de salvar
 */
import AuditLog from '../models/AuditLog.js';

export const registrarLog = async (dados) => {
  try {
    await AuditLog.create({
      acao: dados.acao,
      entidade: dados.entidade,
      entidadeId: dados.entidadeId,
      entidadeNome: dados.entidadeNome,
      usuarioId: dados.usuarioId,
      usuarioNome: dados.usuarioNome,
      dadosAnteriores: dados.dadosAnteriores,
      dadosNovos: dados.dadosNovos,
      ip: dados.ip,
      userAgent: dados.userAgent,
      detalhes: dados.detalhes,
    });
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error.message);
  }
};

export const extrairInfoRequest = (req) => {
  return {
    ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.get('User-Agent'),
    usuarioId: req.user?._id,
    usuarioNome: req.user?.nome,
  };
};

export const limparDadosSensiveis = (dados) => {
  if (!dados) return dados;

  const dadosLimpos = { ...dados };
  const camposSensiveis = ['senhaHash', 'senha', 'password', 'token', 'refreshToken'];

  camposSensiveis.forEach(campo => {
    if (dadosLimpos[campo]) dadosLimpos[campo] = '[REMOVIDO]';
  });

  if (dadosLimpos._id) dadosLimpos._id = dadosLimpos._id.toString();

  return dadosLimpos;
};

export default {
  registrarLog,
  extrairInfoRequest,
  limparDadosSensiveis,
};
