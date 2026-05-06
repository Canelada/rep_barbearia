'use client'
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatarMoeda } from '@/utils/formatters';
import { API_BASE_URL } from '@/services/api';

const ComissaoChart = ({ funcionarioId, altura = 300 }) => {
  const [dados, setDados] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [resumoPeriodos, setResumoPeriodos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meses, setMeses] = useState(0); // Começa com "Hoje"
  const [usarRangeCustomizado, setUsarRangeCustomizado] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [formPagamento, setFormPagamento] = useState({
    valorPago: '',
    metodoPagamento: 'dinheiro',
    observacoes: '',
    registrarNoCaixa: true,
    dataPagamento: new Date()
  });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json'
  });

  const fetchComissaoData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir URL baseado no tipo de filtro
      let url = `${API_BASE_URL}/api/comissao/funcionario/${funcionarioId}`;

      if (usarRangeCustomizado && startDate && endDate) {
        // Usar range customizado
        const dataInicio = format(startDate, 'yyyy-MM-dd');
        const dataFim = format(endDate, 'yyyy-MM-dd');
        url += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      } else if (meses === 0) {
        // Hoje - converter para range de data
        const hoje = new Date();
        const dataInicio = format(hoje, 'yyyy-MM-dd');
        const dataFim = format(hoje, 'yyyy-MM-dd');
        url += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      } else if (meses === 0.25) {
        // Última semana - converter para range de data
        const hoje = new Date();
        const semanaAtras = new Date();
        semanaAtras.setDate(semanaAtras.getDate() - 6); // Últimos 7 dias
        const dataInicio = format(semanaAtras, 'yyyy-MM-dd');
        const dataFim = format(hoje, 'yyyy-MM-dd');
        url += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      } else if (meses === 1) {
        // Último mês - converter para range de data
        const hoje = new Date();
        const mesAtras = new Date();
        mesAtras.setMonth(mesAtras.getMonth() - 1);
        const dataInicio = format(mesAtras, 'yyyy-MM-dd');
        const dataFim = format(hoje, 'yyyy-MM-dd');
        url += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      } else {
        // Usar seletor de meses padrão
        url += `?meses=${meses}`;
      }

      // Buscar histórico de comissões
      const response = await fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados de comissão');
      }

      const result = await response.json();

      if (result.success) {
        setDados(result.data.grafico);
        setResumo(result.data.resumo);
      } else {
        throw new Error(result.message || 'Erro ao carregar dados');
      }

      // Buscar resumo de períodos (hoje, semana, mês OU range customizado)
      let resumoUrl = `${API_BASE_URL}/api/comissao/funcionario/${funcionarioId}/resumo`;

      if (usarRangeCustomizado && startDate && endDate) {
        // Passar as mesmas datas do range customizado
        const dataInicio = format(startDate, 'yyyy-MM-dd');
        const dataFim = format(endDate, 'yyyy-MM-dd');
        resumoUrl += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      } else if (meses === 0 || meses === 0.25 || meses === 1) {
        // Para opções especiais (Hoje, Semana, Mês), usar o resumo padrão
        // que já mostra esses valores nos cards
        // Não passar parâmetros para manter o comportamento padrão
      }

      const resumoResponse = await fetch(resumoUrl, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (resumoResponse.ok) {
        const resumoResult = await resumoResponse.json();
        if (resumoResult.success) {
          setResumoPeriodos(resumoResult.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar datas com hoje quando alternar para range customizado
  useEffect(() => {
    if (usarRangeCustomizado && !startDate && !endDate) {
      const hoje = new Date();
      setStartDate(hoje);
      setEndDate(hoje);
    }
  }, [usarRangeCustomizado]);

  useEffect(() => {
    if (funcionarioId) {
      fetchComissaoData();
    }
  }, [funcionarioId, meses, usarRangeCustomizado, startDate, endDate]);

  const handleRegistrarPagamento = async (e) => {
    e.preventDefault();

    try {
      if (!formPagamento.valorPago || parseFloat(formPagamento.valorPago) <= 0) {
        alert('Digite um valor válido');
        return;
      }

      // Determinar qual objeto usar baseado no modo
      const dadosPeriodo = usarRangeCustomizado && resumoPeriodos?.periodo
        ? resumoPeriodos.periodo
        : resumoPeriodos?.mes;

      const response = await fetch(`${API_BASE_URL}/api/comissao/pagamento`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          funcionarioId,
          valorPago: parseFloat(formPagamento.valorPago),
          valorComissao: dadosPeriodo?.comissao || parseFloat(formPagamento.valorPago),
          metodoPagamento: formPagamento.metodoPagamento,
          observacoes: formPagamento.observacoes,
          registrarNoCaixa: formPagamento.registrarNoCaixa,
          dataPagamento: formPagamento.dataPagamento
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Pagamento registrado com sucesso!');
        setModalPagamentoAberto(false);
        setFormPagamento({
          valorPago: '',
          metodoPagamento: 'dinheiro',
          observacoes: '',
          registrarNoCaixa: true,
          dataPagamento: new Date()
        });
        // Recarregar dados
        await fetchComissaoData();
      } else {
        alert(result.message || 'Erro ao registrar pagamento');
      }
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      alert('Erro ao registrar pagamento');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-green-600">
            <span className="font-medium">Comissão: {formatarMoeda(data.totalComissao)}</span>
          </p>
          <p className="text-blue-600 text-sm">
            Agendamentos: {data.agendamentos}
          </p>
          <p className="text-gray-600 text-sm">
            Serviços: {formatarMoeda(data.totalServicos)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="ml-2 text-gray-600">Carregando gráfico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 text-sm">⚠️ {error}</span>
          <button
            onClick={fetchComissaoData}
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Comissões</h3>

          {/* Toggle entre meses e range customizado */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUsarRangeCustomizado(false)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                !usarRangeCustomizado
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Por Meses
            </button>
            <button
              onClick={() => setUsarRangeCustomizado(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                usarRangeCustomizado
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Range Customizado
            </button>
          </div>
        </div>

        {/* Seletores baseados no modo */}
        <div className="flex items-center justify-end gap-3">
          {!usarRangeCustomizado ? (
            // Seletor de meses
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Período:</label>
              <select
                value={meses}
                onChange={(e) => setMeses(parseFloat(e.target.value))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500"
              >
                <option value={0}>Hoje</option>
                <option value={0.25}>Última Semana</option>
                <option value={1}>Último Mês</option>
              </select>
            </div>
          ) : (
            // Seletor de range customizado
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">De:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  placeholderText="Data inicial"
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Até:</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  placeholderText="Data final"
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 w-32"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo por Períodos - Hoje, Semana, Mês OU Range Customizado */}
      {resumoPeriodos && (
        <>
          {/* Modo Range Customizado - Mostrar apenas card do período selecionado */}
          {usarRangeCustomizado && resumoPeriodos.periodo ? (
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 rounded-lg p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-purple-800 text-base font-bold uppercase tracking-wide">
                    📆 Período Selecionado
                  </div>
                  <div className="text-purple-700 text-sm bg-purple-200 px-3 py-1.5 rounded-full font-medium">
                    {resumoPeriodos.periodo.agendamentos} agendamentos
                  </div>
                </div>
                <div className="text-purple-900 text-3xl font-extrabold mb-1">
                  {formatarMoeda(resumoPeriodos.periodo.comissao)}
                </div>
                {startDate && endDate && (
                  <div className="text-purple-700 text-sm mt-2">
                    {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} até {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                )}

                {/* Barra de progresso de pagamento */}
                {resumoPeriodos.periodo.comissao > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-green-700 font-semibold">
                        Pago: {formatarMoeda(resumoPeriodos.periodo.pago || 0)}
                      </span>
                      <span className="text-orange-700 font-semibold">
                        A pagar: {formatarMoeda(resumoPeriodos.periodo.aPagar || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (resumoPeriodos.periodo.pago / resumoPeriodos.periodo.comissao) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Modo Padrão - Mostrar três cards (Hoje, Semana, Mês) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Comissão de Hoje */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-cyan-700 text-sm font-semibold uppercase tracking-wide">
                    💵 Hoje
                  </div>
                  <div className="text-cyan-600 text-xs bg-cyan-200 px-2 py-1 rounded-full">
                    {resumoPeriodos.hoje?.agendamentos || 0} agend.
                  </div>
                </div>
                <div className="text-cyan-900 text-2xl font-bold">
                  {formatarMoeda(resumoPeriodos.hoje?.comissao || 0)}
                </div>
              </div>

              {/* Comissão da Semana */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-indigo-700 text-sm font-semibold uppercase tracking-wide">
                    📅 Esta Semana
                  </div>
                  <div className="text-indigo-600 text-xs bg-indigo-200 px-2 py-1 rounded-full">
                    {resumoPeriodos.semana?.agendamentos || 0} agend.
                  </div>
                </div>
                <div className="text-indigo-900 text-2xl font-bold">
                  {formatarMoeda(resumoPeriodos.semana?.comissao || 0)}
                </div>
              </div>

              {/* Comissão do Mês */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-emerald-700 text-sm font-semibold uppercase tracking-wide">
                    📊 Este Mês
                  </div>
                  <div className="text-emerald-600 text-xs bg-emerald-200 px-2 py-1 rounded-full">
                    {resumoPeriodos.mes?.agendamentos || 0} agend.
                  </div>
                </div>
                <div className="text-emerald-900 text-2xl font-bold">
                  {formatarMoeda(resumoPeriodos.mes?.comissao || 0)}
                </div>

                {/* Barra de progresso de pagamento */}
                {resumoPeriodos.mes?.comissao > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-700">
                        Pago: {formatarMoeda(resumoPeriodos.mes.pago || 0)}
                      </span>
                      <span className="text-orange-700">
                        A pagar: {formatarMoeda(resumoPeriodos.mes.aPagar || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (resumoPeriodos.mes.pago / resumoPeriodos.mes.comissao) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Card de Status de Pagamento */}
      {resumoPeriodos && (
        (() => {
          // Determinar qual objeto usar baseado no modo
          const dadosPeriodo = usarRangeCustomizado && resumoPeriodos.periodo
            ? resumoPeriodos.periodo
            : resumoPeriodos.mes;

          // Só mostrar se houver comissão
          if (!dadosPeriodo || dadosPeriodo.comissao <= 0) return null;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Comissão Paga */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-green-800 text-sm font-bold uppercase tracking-wide">
                    ✅ Comissão Paga
                  </div>
                </div>
                <div className="text-green-900 text-3xl font-extrabold">
                  {formatarMoeda(dadosPeriodo.pago || 0)}
                </div>
                <div className="text-green-700 text-xs mt-1">
                  {dadosPeriodo.pago > 0
                    ? usarRangeCustomizado
                      ? 'Pagamentos registrados no período'
                      : 'Pagamentos registrados no mês'
                    : 'Nenhum pagamento registrado'}
                </div>
              </div>

              {/* Comissão a Pagar */}
              <div className={`bg-gradient-to-br ${
                dadosPeriodo.aPagar > 0
                  ? 'from-orange-50 to-orange-100 border-orange-400'
                  : 'from-gray-50 to-gray-100 border-gray-300'
              } border-2 rounded-lg p-4 shadow-md`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`${
                    dadosPeriodo.aPagar > 0 ? 'text-orange-800' : 'text-gray-700'
                  } text-sm font-bold uppercase tracking-wide`}>
                    {dadosPeriodo.aPagar > 0 ? '⏳ A Pagar' : '✓ Tudo Pago'}
                  </div>
                </div>
                <div className={`${
                  dadosPeriodo.aPagar > 0 ? 'text-orange-900' : 'text-gray-700'
                } text-3xl font-extrabold`}>
                  {formatarMoeda(dadosPeriodo.aPagar || 0)}
                </div>
                <div className={`${
                  dadosPeriodo.aPagar > 0 ? 'text-orange-700' : 'text-gray-600'
                } text-xs mt-1`}>
                  {dadosPeriodo.aPagar > 0
                    ? 'Comissão pendente de pagamento'
                    : 'Todas as comissões foram pagas'}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Botão de Registrar Pagamento */}
      {resumoPeriodos && (
        (() => {
          // Determinar qual objeto usar baseado no modo
          const dadosPeriodo = usarRangeCustomizado && resumoPeriodos.periodo
            ? resumoPeriodos.periodo
            : resumoPeriodos.mes;

          // Só mostrar se houver valor a pagar
          if (!dadosPeriodo || dadosPeriodo.aPagar <= 0) return null;

          return (
            <div className="mb-4">
              <button
                onClick={() => {
                  setFormPagamento({
                    ...formPagamento,
                    valorPago: dadosPeriodo.aPagar.toString()
                  });
                  setModalPagamentoAberto(true);
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
              >
                💰 Registrar Pagamento de Comissão
              </button>
            </div>
          );
        })()
      )}

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-green-800 text-xs font-medium uppercase tracking-wide">
              Total Comissão
            </div>
            <div className="text-green-900 text-lg font-bold">
              {formatarMoeda(resumo.totalComissao)}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-xs font-medium uppercase tracking-wide">
              Agendamentos
            </div>
            <div className="text-blue-900 text-lg font-bold">
              {resumo.totalAgendamentos}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-amber-800 text-xs font-medium uppercase tracking-wide">
              Total Serviços
            </div>
            <div className="text-amber-900 text-lg font-bold">
              {formatarMoeda(resumo.totalServicos)}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-purple-800 text-xs font-medium uppercase tracking-wide">
              Média Mensal
            </div>
            <div className="text-purple-900 text-lg font-bold">
              {formatarMoeda(resumo.mediaComissaoMensal)}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {dados.length > 0 ? (
          <ResponsiveContainer width="100%" height={altura}>
            <LineChart data={dados} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="mes"
                stroke="#666"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="totalComissao"
                stroke="#059669"
                strokeWidth={3}
                dot={{ fill: '#059669', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500">
            📊 Nenhum dado de comissão encontrado para o período selecionado
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="text-xs text-gray-500 text-center">
        {(() => {
          if (usarRangeCustomizado && startDate && endDate) {
            const dias = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            return dias <= 31
              ? 'Gráfico mostra a evolução diária das comissões baseada em agendamentos concluídos'
              : 'Gráfico mostra a evolução mensal das comissões baseada em agendamentos concluídos';
          }
          if (meses === 0) return 'Gráfico mostra as comissões do dia baseadas em agendamentos concluídos';
          if (meses === 0.25) return 'Gráfico mostra a evolução diária das comissões da última semana';
          if (meses === 1) return 'Gráfico mostra a evolução diária das comissões do último mês';
          return 'Gráfico mostra a evolução das comissões baseada em agendamentos concluídos';
        })()}
      </div>

      {/* Modal de Registrar Pagamento */}
      {modalPagamentoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold text-white">Registrar Pagamento de Comissão</h2>
            </div>

            <form onSubmit={handleRegistrarPagamento} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor a Pagar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formPagamento.valorPago}
                  onChange={(e) => setFormPagamento({ ...formPagamento, valorPago: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0.00"
                />
                {(() => {
                  const dadosPeriodo = usarRangeCustomizado && resumoPeriodos?.periodo
                    ? resumoPeriodos.periodo
                    : resumoPeriodos?.mes;

                  return dadosPeriodo?.aPagar > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Valor pendente: {formatarMoeda(dadosPeriodo.aPagar)}
                    </p>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pagamento *
                </label>
                <select
                  value={formPagamento.metodoPagamento}
                  onChange={(e) => setFormPagamento({ ...formPagamento, metodoPagamento: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento *
                </label>
                <DatePicker
                  selected={formPagamento.dataPagamento}
                  onChange={(date) => setFormPagamento({ ...formPagamento, dataPagamento: date })}
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  maxDate={new Date()}
                  placeholderText="Selecione a data"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Data em que o pagamento foi realizado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formPagamento.observacoes}
                  onChange={(e) => setFormPagamento({ ...formPagamento, observacoes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows="3"
                  placeholder="Informações adicionais sobre o pagamento..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="registrarNoCaixa"
                  checked={formPagamento.registrarNoCaixa}
                  onChange={(e) => setFormPagamento({ ...formPagamento, registrarNoCaixa: e.target.checked })}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="registrarNoCaixa" className="ml-2 block text-sm text-gray-900">
                  Registrar saída no caixa
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                >
                  Confirmar Pagamento
                </button>
                <button
                  type="button"
                  onClick={() => setModalPagamentoAberto(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComissaoChart;
