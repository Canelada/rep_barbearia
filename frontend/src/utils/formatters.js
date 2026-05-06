/**
 * Utilitários de formatação para padrões brasileiros
 */

/**
 * Formatar valor monetário em Real brasileiro
 */
export const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
};

/**
 * Formatar data no padrão brasileiro DD/MM/AAAA
 */
export const formatarDataBrasileira = (data) => {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
};

/**
 * Formatar data e hora no padrão brasileiro DD/MM/AAAA HH:mm
 */
export const formatarDataHoraBrasileira = (data) => {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
};

/**
 * Formatar apenas a hora no padrão brasileiro HH:mm
 */
export const formatarHoraBrasileira = (data) => {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
};

/**
 * Formatar data com nome do mês DD de MMMM de AAAA
 */
export const formatarDataPorExtenso = (data) => {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
};

/**
 * Formatar data com mês abreviado DD MMM AAAA
 */
export const formatarDataAbreviada = (data) => {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
};

/**
 * Formatar número no padrão brasileiro
 */
export const formatarNumero = (numero) => {
  return new Intl.NumberFormat('pt-BR').format(numero || 0);
};

/**
 * Formatar telefone brasileiro
 */
export const formatarTelefone = (telefone) => {
  if (!telefone) return '';
  const numbers = telefone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
};

/**
 * Converter data ISO para formato de input date
 */
export const converterParaInputDate = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toISOString().split('T')[0];
};

/**
 * Converter formato de input date para ISO
 */
export const converterDeInputDate = (inputDate) => {
  if (!inputDate) return null;
  return new Date(inputDate + 'T00:00:00.000Z').toISOString();
};

/**
 * Converter data para formato datetime-local preservando a hora local
 * Usado para inputs de datetime-local que precisam manter a hora brasileira
 */
export const converterParaDateTimeLocal = (data) => {
  if (!data) return '';

  const date = new Date(data);

  // Verificar se é uma data válida
  if (isNaN(date.getTime())) return '';

  // Obter os componentes da data em timezone local (Brasil)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Converter datetime-local para ISO preservando a hora brasileira
 * Usado para enviar dados do input datetime-local para o backend
 */
export const converterDateTimeLocalParaISO = (dateTimeLocal) => {
  if (!dateTimeLocal) return null;

  // dateTimeLocal está no formato: 2025-09-24T19:00
  // Precisamos tratá-lo como hora local brasileira
  const date = new Date(dateTimeLocal);

  if (isNaN(date.getTime())) return null;

  return date.toISOString();
};
