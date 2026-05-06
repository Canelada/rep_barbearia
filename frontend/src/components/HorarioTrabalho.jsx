'use client'

const HorarioTrabalho = ({ horarioTrabalho, setFormData, formData, readOnly = false }) => {
  const diasSemana = [
    { key: 'segunda', label: 'Segunda-feira', emoji: '📅' },
    { key: 'terca', label: 'Terça-feira', emoji: '📅' },
    { key: 'quarta', label: 'Quarta-feira', emoji: '📅' },
    { key: 'quinta', label: 'Quinta-feira', emoji: '📅' },
    { key: 'sexta', label: 'Sexta-feira', emoji: '📅' },
    { key: 'sabado', label: 'Sábado', emoji: '📅' },
    { key: 'domingo', label: 'Domingo', emoji: '🏖️' }
  ];

  const updateHorario = (dia, campo, valor) => {
    if (readOnly) return;

    setFormData({
      ...formData,
      horarioTrabalho: {
        ...formData.horarioTrabalho,
        [dia]: {
          ...(formData.horarioTrabalho?.[dia] || {}),
          [campo]: valor
        }
      }
    });
  };

  const formatarHorarioResumo = (horario) => {
    if (!horario || typeof horario !== 'object') return 'Não definido';

    const diasAtivos = Object.entries(horario).filter(([, info]) => info && info.ativo);

    if (diasAtivos.length === 0) return 'Não trabalha';

    // Agrupar dias com mesmo horário
    const grupos = {};
    diasAtivos.forEach(([dia, info]) => {
      if (info && info.inicio && info.fim) {
        const chave = `${info.inicio}-${info.fim}`;
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(dia);
      }
    });

    return Object.entries(grupos).map(([horario, dias]) => {
      const [inicio, fim] = horario.split('-');
      const diasAbrev = dias.map(dia => {
        const map = { segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb', domingo: 'Dom' };
        return map[dia] || dia;
      }).join(', ');
      return `${diasAbrev}: ${inicio} às ${fim}`;
    }).join(' • ');
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">🕐 Horário de Trabalho</h4>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {formatarHorarioResumo(horarioTrabalho)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">🕐 Horário de Trabalho</h4>
        <button
          type="button"
          onClick={() => {
            const novoHorario = {};
            diasSemana.forEach(({ key }) => {
              novoHorario[key] = {
                ativo: key !== 'domingo',
                inicio: '08:00',
                fim: key === 'sabado' ? '16:00' : '18:00'
              };
            });
            setFormData({ ...formData, horarioTrabalho: novoHorario });
          }}
          className="text-xs text-amber-600 hover:text-amber-700 underline"
        >
          Resetar padrão
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
        {diasSemana.map(({ key, label, emoji }) => {
          const diaData = horarioTrabalho?.[key] || {};
          return (
            <div key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <input
                  type="checkbox"
                  id={`${key}-ativo`}
                  checked={diaData.ativo || false}
                  onChange={(e) => updateHorario(key, 'ativo', e.target.checked)}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor={`${key}-ativo`} className="text-sm font-medium text-gray-700 min-w-0">
                  {emoji} {label}
                </label>
              </div>

              {diaData.ativo && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={diaData.inicio || '08:00'}
                    onChange={(e) => updateHorario(key, 'inicio', e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-gray-500">às</span>
                  <input
                    type="time"
                    value={diaData.fim || (key === 'sabado' ? '16:00' : '18:00')}
                    onChange={(e) => updateHorario(key, 'fim', e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {!diaData.ativo && (
                <span className="text-xs text-gray-400 italic">Folga</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs font-medium text-blue-800 mb-1">Resumo:</div>
        <div className="text-xs text-blue-700">
          {formatarHorarioResumo(horarioTrabalho)}
        </div>
      </div>
    </div>
  );
};

export default HorarioTrabalho;
