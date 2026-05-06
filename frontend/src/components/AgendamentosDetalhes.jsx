'use client'
import { useCallback, useState, useEffect } from 'react';
import { formatarMoeda } from '@/utils/formatters';
import { API_BASE_URL } from '@/services/api';

const AgendamentosDetalhes = ({ funcionarioId }) => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(3); // meses

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json'
  });

  const fetchAgendamentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - periodo);

      const response = await fetch(`${API_BASE_URL}/api/agendamentos`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar agendamentos');
      }

      const result = await response.json();
      const agendamentosArray = Array.isArray(result) ? result : result.data || [];

      // Filtrar agendamentos do funcionário no período
      const agendamentosFiltrados = agendamentosArray.filter(ag => {
        const agFuncionarioId = typeof ag.funcionarioId === 'object' && ag.funcionarioId !== null ? ag.funcionarioId._id : ag.funcionarioId;
        const dataAgendamento = new Date(ag.dataHora);
        return agFuncionarioId === funcionarioId &&
               ag.status === 'concluido' &&
               dataAgendamento >= dataInicio;
      });

      // Ordenar por data (mais recente primeiro)
      agendamentosFiltrados.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

      setAgendamentos(agendamentosFiltrados);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [funcionarioId, periodo]);

  useEffect(() => {
    if (funcionarioId) {
      fetchAgendamentos();
    }
  }, [funcionarioId, periodo, fetchAgendamentos]);

  const formatarData = (dataHora) => {
    const data = new Date(dataHora);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarHora = (dataHora) => {
    const data = new Date(dataHora);
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularComissaoAgendamento = (agendamento) => {
    let comissaoTotal = 0;

    if (agendamento.servicos && agendamento.servicos.length > 0) {
      // Formato novo - múltiplos serviços
      comissaoTotal = agendamento.servicos.reduce((total, servico) => {
        const valorServico = servico.preco || 0;
        const comissaoServico = servico.comissao || 0;
        return total + (valorServico * (comissaoServico / 100));
      }, 0);
    } else {
      // Formato antigo - serviço único
      const valorServico = agendamento.preco || agendamento.valor || 0;
      const comissaoServico = agendamento.comissao || 0;
      comissaoTotal = valorServico * (comissaoServico / 100);
    }

    return comissaoTotal;
  };

  const obterServicos = (agendamento) => {
    if (agendamento.servicos && agendamento.servicos.length > 0) {
      return agendamento.servicos.map(s => s.servicoId?.nome || 'Serviço').join(', ');
    } else if (agendamento.servicoId) {
      return typeof agendamento.servicoId === 'object' ? agendamento.servicoId.nome : 'Serviço';
    }
    return 'Serviço não identificado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
        <span className="ml-2 text-gray-600">Carregando agendamentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 text-sm">⚠️ {error}</span>
          <button
            onClick={fetchAgendamentos}
            className="ml-2 text-red-600 underline text-sm hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Agendamentos Realizados</h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Período:</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500"
          >
            <option value={1}>1 mês</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      </div>

      {/* Tabela de Agendamentos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {agendamentos.length > 0 ? (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serviços
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agendamentos.map((agendamento) => (
                  <tr key={agendamento._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatarData(agendamento.dataHora)}
                        </div>
                        <div className="text-gray-500">
                          {formatarHora(agendamento.dataHora)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">
                        {agendamento.clienteNome || 'Cliente não identificado'}
                      </div>
                      {agendamento.clienteTelefone && (
                        <div className="text-gray-500 text-xs">
                          {agendamento.clienteTelefone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-32 truncate" title={obterServicos(agendamento)}>
                        {obterServicos(agendamento)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatarMoeda(agendamento.preco || agendamento.valor || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatarMoeda(calcularComissaoAgendamento(agendamento))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500">
            📅 Nenhum agendamento concluído encontrado para o período selecionado
          </div>
        )}
      </div>

      {/* Resumo */}
      {agendamentos.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{agendamentos.length}</div>
              <div className="text-xs text-gray-600">Agendamentos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {formatarMoeda(agendamentos.reduce((total, ag) => total + (ag.preco || ag.valor || 0), 0))}
              </div>
              <div className="text-xs text-gray-600">Total Serviços</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatarMoeda(agendamentos.reduce((total, ag) => total + calcularComissaoAgendamento(ag), 0))}
              </div>
              <div className="text-xs text-gray-600">Total Comissão</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendamentosDetalhes;
