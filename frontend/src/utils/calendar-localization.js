/**
 * Configurações de localização para React Big Calendar em português brasileiro
 */
import { ptBR } from 'date-fns/locale';

export const messages = {
  next: 'Próximo',
  previous: 'Anterior',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  allDay: 'Dia todo',
  yesterday: 'Ontem',
  tomorrow: 'Amanhã',
  noEventsInRange: 'Não há agendamentos neste período.',
  showMore: (total) => `+ ${total} mais`,
  work_week: 'Semana de trabalho',
  yesterday: 'Ontem',
  tomorrow: 'Amanhã',
};

export const formats = {
  // Formato do dia (número)
  dayFormat: 'dd',

  // Formato do dia da semana (segunda, terça, etc.)
  weekdayFormat: 'eeee',

  // Cabeçalho do mês (Janeiro 2025)
  monthHeaderFormat: 'MMMM yyyy',

  // Cabeçalho do dia (Segunda-feira, 01 de Janeiro)
  dayHeaderFormat: "eeee, dd 'de' MMMM",

  // Formato do intervalo de datas (01 Jan – 07 Jan 2025)
  dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'dd MMM', culture)} – ${localizer.format(
      end,
      'dd MMM yyyy',
      culture
    )}`,

  // Data na agenda (01 Jan)
  agendaDateFormat: 'dd MMM',

  // Hora na agenda (14:30)
  agendaTimeFormat: 'HH:mm',

  // Intervalo de horário (14:30 – 15:30)
  agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(
      end,
      'HH:mm',
      culture
    )}`,

  // Formato de seleção de tempo
  selectRangeFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(
      end,
      'HH:mm',
      culture
    )}`,

  // Formato do evento
  eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(
      end,
      'HH:mm',
      culture
    )}`,

  // Formato do mês na visualização semanal
  monthDateFormat: 'dd',

  // Formato do cabeçalho da semana
  dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'dd', culture)} – ${localizer.format(
      end,
      "dd 'de' MMMM 'de' yyyy",
      culture
    )}`,
};

export const locale = ptBR;
