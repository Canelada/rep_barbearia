'use client'
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatarDataBrasileira } from '@/utils/formatters';

const CalendarHeader = ({
  title,
  subtitle,
  date,
  onNavigate,
  mode = 'day', // 'day', 'month', 'week', 'range'
  view,
  onViewChange,
  onToday,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  children, // Para botões adicionais como "Novo Agendamento"
  className = ''
}) => {
  // Se date não estiver disponível ainda, não renderizar a parte que depende dele
  const currentDate = date && !isNaN(date.getTime()) ? date : null;

  const goToBack = () => {
    if (!onNavigate || !currentDate) return;

    let newDate = new Date(currentDate);
    if (mode === 'month' || view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (mode === 'week' || view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (mode === 'calendar') {
      // Para calendário, usar view atual
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onNavigate(newDate);
  };

  const goToNext = () => {
    if (!onNavigate || !currentDate) return;

    let newDate = new Date(currentDate);
    if (mode === 'month' || view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (mode === 'week' || view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (mode === 'calendar') {
      // Para calendário, usar view atual
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onNavigate(newDate);
  };

  const goToToday = () => {
    if (onToday) {
      onToday();
    } else if (onNavigate) {
      onNavigate(new Date());
    }
  };

  const formatDateByMode = () => {
    if (mode === 'range') {
      if (startDate && endDate) {
        return `${formatarDataBrasileira(startDate)} - ${formatarDataBrasileira(endDate)}`;
      }
      return 'Selecione o período';
    }

    if (!currentDate) return 'Carregando...';

    if (mode === 'month' || view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    } else if (mode === 'week' || view === 'week') {
      return format(currentDate, "'Semana de' dd 'de' MMMM yyyy", { locale: ptBR });
    } else if (mode === 'calendar') {
      // Para calendário, usar view atual
      if (view === 'month') {
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
      } else if (view === 'week') {
        return format(currentDate, "'Semana de' dd 'de' MMMM yyyy", { locale: ptBR });
      } else {
        return formatarDataBrasileira(currentDate);
      }
    } else {
      return formatarDataBrasileira(currentDate);
    }
  };

  const getWeekday = () => {
    if (!currentDate) return '';
    if (mode === 'day' || (mode === 'calendar' && view === 'day')) {
      return currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    }
    return '';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4">
        {/* Cabeçalho principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {children && (
            <div className="flex items-center space-x-2">
              {children}
            </div>
          )}
        </div>

        {/* Navegação de data */}
        {mode !== 'static' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Controles de navegação */}
            <div className="flex items-center space-x-2">
              {mode !== 'range' && (
                <>
                  <button
                    onClick={goToBack}
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={`${
                      mode === 'month' || view === 'month' || (mode === 'calendar' && view === 'month') ? 'Mês' : 
                      mode === 'week' || view === 'week' || (mode === 'calendar' && view === 'week') ? 'Semana' : 'Dia'
                    } anterior`}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {mode === 'month' || view === 'month' || (mode === 'calendar' && view === 'month') ? 'Mês Anterior' : 
                     mode === 'week' || view === 'week' || (mode === 'calendar' && view === 'week') ? 'Semana Anterior' : 
                     'Dia Anterior'}
                  </button>

                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    Hoje
                  </button>

                  <button
                    onClick={goToNext}
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={`Próximo ${
                      mode === 'month' || view === 'month' || (mode === 'calendar' && view === 'month') ? 'mês' : 
                      mode === 'week' || view === 'week' || (mode === 'calendar' && view === 'week') ? 'semana' : 'dia'
                    }`}
                  >
                    {mode === 'month' || view === 'month' || (mode === 'calendar' && view === 'month') ? 'Próximo Mês' : 
                     mode === 'week' || view === 'week' || (mode === 'calendar' && view === 'week') ? 'Próxima Semana' : 
                     'Próximo Dia'}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Display da data atual */}
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatDateByMode()}
              </div>
              {getWeekday() && (
                <div className="text-sm text-gray-500 capitalize">
                  {getWeekday()}
                </div>
              )}
            </div>

            {/* Controles de visualização */}
            {onViewChange && view && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['month', 'week', 'day'].map((viewName) => (
                  <button
                    key={viewName}
                    onClick={() => onViewChange(viewName)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      view === viewName
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {viewName === 'month' ? 'Mês' : 
                     viewName === 'week' ? 'Semana' : 'Dia'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarHeader;
