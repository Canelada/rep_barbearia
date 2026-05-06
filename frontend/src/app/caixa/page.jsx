'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout';
import CalendarHeader from '@/components/CalendarHeader';
import { formatarMoeda, formatarDataBrasileira } from '@/utils/formatters';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';

export default function CaixaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [caixa, setCaixa] = useState(null);
  const [user, setUser] = useState(null);
  const [agendamentosReais, setAgendamentosReais] = useState([]);
  const [estatisticasCategorias, setEstatisticasCategorias] = useState({});
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('servicos');
  const [tipo, setTipo] = useState('entrada');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para abertura/fechamento de caixa
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [operacaoLoading, setOperacaoLoading] = useState(false);

  const categoriasDisponiveis = [
    { id: 'servicos', nome: 'Serviços', icone: '✂️', cor: 'green' },
    { id: 'produtos', nome: 'Produtos', icone: '🧴', cor: 'blue' },
    { id: 'despesas', nome: 'Despesas', icone: '💸', cor: 'red' },
    { id: 'outros', nome: 'Outros', icone: '📝', cor: 'gray' },
  ];

  useEffect(() => {
    // Carregar dados do usuário
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDadosDia();
  }, [dataAtual]);

  const fetchDadosDia = async () => {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    await fetchCaixa(dataFormatada);
  };

  const fetchCaixa = async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/caixa?data=${data}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      const result = await res.json();
      if (res.ok) {
        setCaixa(result.data);
        setAgendamentosReais(result.agendamentos || []);

        // Atualizar estatísticas baseado nos dados retornados
        fetchEstatisticasCategorias(result.data, result.agendamentos || []);
      } else {
        setError(result.message || 'Erro ao carregar dados do caixa');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const fetchEstatisticasCategorias = async (dadosCaixa, agendamentos = []) => {
    try {
      const stats = {};

      // Inicializar categorias
      categoriasDisponiveis.forEach((cat) => {
        stats[cat.id] = { entradas: 0, saidas: 0, total: 0 };
      });

      // Adicionar receita dos agendamentos como entradas de serviços
      agendamentos.forEach((agendamento) => {
        const cat = 'servicos';
        const valor = agendamento.preco || 0;
        stats[cat].entradas += valor;
        stats[cat].total += valor;
      });

      // Agrupar entradas manuais por categoria
      dadosCaixa.entradas?.forEach((entrada) => {
        const cat = entrada.categoria || 'outros';
        if (!stats[cat]) {
          stats[cat] = { entradas: 0, saidas: 0, total: 0 };
        }
        stats[cat].entradas += entrada.valor;
        stats[cat].total += entrada.valor;
      });

      // Agrupar saídas por categoria
      dadosCaixa.saidas?.forEach((saida) => {
        const cat = saida.categoria || 'outros';
        if (!stats[cat]) {
          stats[cat] = { entradas: 0, saidas: 0, total: 0 };
        }
        stats[cat].saidas += saida.valor;
        stats[cat].total -= saida.valor;
      });

      setEstatisticasCategorias(stats);
    } catch (err) {
      console.error('Erro ao calcular estatísticas:', err);
    }
  };

  const handleAdd = async () => {
    if (!valor || !descricao) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/caixa`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          valor: parseFloat(valor),
          descricao,
          categoria: categoria,
          tipo,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        await fetchDadosDia(); // Recarregar dados
        setValor('');
        setDescricao('');
        setCategoria('servicos');
      } else {
        setError(result.message || 'Erro ao adicionar movimentação');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async () => {
    if (!saldoInicial || isNaN(parseFloat(saldoInicial))) {
      setError('Saldo inicial deve ser um número válido');
      return;
    }

    setOperacaoLoading(true);
    setError('');

    try {
      const dataFormatada = dataAtual.toISOString().split('T')[0];
      const res = await fetch(`${API_BASE_URL}/api/caixa/${dataFormatada}/abrir`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          saldoInicial: parseFloat(saldoInicial),
          observacoes
        }),
      });

      const result = await res.json();
      if (res.ok) {
        await fetchDadosDia(); // Recarregar dados
        setShowAbrirModal(false);
        setSaldoInicial('0');
        setObservacoes('');
      } else {
        setError(result.message || 'Erro ao abrir caixa');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setOperacaoLoading(false);
    }
  };

  const handleFecharCaixa = async () => {
    setOperacaoLoading(true);
    setError('');

    try {
      const dataFormatada = dataAtual.toISOString().split('T')[0];
      const res = await fetch(`${API_BASE_URL}/api/caixa/${dataFormatada}/fechar`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          observacoes
        }),
      });

      const result = await res.json();
      if (res.ok) {
        await fetchDadosDia(); // Recarregar dados
        setShowFecharModal(false);
        setObservacoes('');
      } else {
        setError(result.message || 'Erro ao fechar caixa');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setOperacaoLoading(false);
    }
  };


  return (
    <Layout>
      <div className="space-y-6">
        <CalendarHeader
          title="Controle de Caixa"
          subtitle="Gerencie as movimentações financeiras diárias"
          date={dataAtual}
          mode="day"
          onNavigate={setDataAtual}
          onToday={() => setDataAtual(new Date())}
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Status do Caixa */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Status do Caixa - {formatarDataBrasileira(dataAtual)}
                </h3>
                <div className="flex items-center space-x-3 mt-2">
                  {caixa?.status ? (
                    <>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        caixa.status.aberto && !caixa.status.fechado
                          ? 'bg-green-100 text-green-800'
                          : caixa.status.fechado
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caixa.status.aberto && !caixa.status.fechado
                          ? '🟢 Caixa Aberto'
                          : caixa.status.fechado
                          ? '🔒 Caixa Fechado'
                          : '⭕ Caixa Não Aberto'
                        }
                      </span>
                      {caixa.status.dataAbertura && (
                        <span className="text-sm text-gray-600">
                          Aberto às {new Date(caixa.status.dataAbertura).toLocaleTimeString('pt-BR')}
                        </span>
                      )}
                      {caixa.status.dataFechamento && (
                        <span className="text-sm text-gray-600">
                          Fechado às {new Date(caixa.status.dataFechamento).toLocaleTimeString('pt-BR')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      ⭕ Caixa Não Aberto
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {user?.role === 'admin' && (
                <>
                  {!caixa?.status?.aberto && !caixa?.status?.fechado && (
                    <button
                      onClick={() => setShowAbrirModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center w-full sm:w-auto"
                    >
                      <span className="mr-2">🟢</span>
                      Abrir Caixa
                    </button>
                  )}

                  {caixa?.status?.aberto && !caixa?.status?.fechado && (
                    <button
                      onClick={() => setShowFecharModal(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center w-full sm:w-auto"
                    >
                      <span className="mr-2">🔒</span>
                      Fechar Caixa
                    </button>
                  )}
                </>
              )}

              {user?.role !== 'admin' && (
                <span className="text-sm text-gray-600 italic">
                  👑 Apenas administradores podem controlar o caixa
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas por Categoria */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Movimentação por Categoria
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {categoriasDisponiveis.map((cat) => {
              const stats = estatisticasCategorias[cat.id] || {
                entradas: 0,
                saidas: 0,
                total: 0,
              };
              return (
                <div
                  key={cat.id}
                  className={`bg-${cat.cor}-50 rounded-lg p-4 border-l-4 border-${cat.cor}-400`}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{cat.icone}</span>
                    <span className="font-medium text-gray-900">
                      {cat.nome}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Entradas:</span>
                      <span className="font-medium">
                        {formatarMoeda(stats.entradas)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Saídas:</span>
                      <span className="font-medium">
                        {formatarMoeda(stats.saidas)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Saldo:</span>
                      <span
                        className={`font-bold ${
                          stats.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatarMoeda(stats.total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulário de Nova Movimentação - Apenas Admin */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Nova Movimentação
              </h2>
              {!caixa?.status?.podeReceberMovimentacoes && (
                <span className="text-sm text-red-600 font-medium">
                  ⚠️ Caixa deve estar aberto para movimentações
                </span>
              )}
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Descrição da movimentação"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
                disabled={loading || !caixa?.status?.podeReceberMovimentacoes}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
                disabled={loading || !caixa?.status?.podeReceberMovimentacoes}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
                disabled={loading || !caixa?.status?.podeReceberMovimentacoes}
              >
                {categoriasDisponiveis.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icone} {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
                disabled={loading || !caixa?.status?.podeReceberMovimentacoes}
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleAdd}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !caixa?.status?.podeReceberMovimentacoes}
            >
              {loading ? 'Adicionando...' : 'Adicionar Movimentação'}
            </button>
          </div>
        </div>
        )}

        {/* Mensagem para não-administradores */}
        {user?.role !== 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-3xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-medium text-blue-900">Acesso Restrito</h3>
                <p className="text-sm text-blue-800 mt-1">
                  O controle de caixa e movimentações financeiras é restrito apenas para administradores.
                  Você pode visualizar as informações, mas não pode realizar alterações.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resumo do Dia */}
        {caixa && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Resumo do Dia - {formatarDataBrasileira(dataAtual)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Total de Entradas
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatarMoeda(caixa.totalEntradas || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">💸</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">
                      Total de Saídas
                    </p>
                    <p className="text-2xl font-bold text-red-900">
                      {formatarMoeda(caixa.totalSaidas || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Saldo do Dia
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        (caixa.saldoDia || 0) >= 0
                          ? 'text-blue-900'
                          : 'text-red-900'
                      }`}
                    >
                      {formatarMoeda(caixa.saldoDia || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agendamentos Concluídos */}
            {agendamentosReais.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  💼 Serviços Realizados ({agendamentosReais.length})
                </h3>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {agendamentosReais.map((agendamento, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-2 border-b border-green-200 last:border-b-0"
                      >
                        <div>
                          <span className="font-medium text-green-900">
                            {agendamento.clienteNome}
                          </span>
                          <span className="text-green-600 ml-2">
                            - {agendamento.servicoNome}
                          </span>
                        </div>
                        <span className="font-bold text-green-900">
                          {formatarMoeda(agendamento.preco || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Movimentações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  Entradas
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {caixa.entradas && caixa.entradas.length > 0 ? (
                    caixa.entradas.map((entrada, i) => (
                      <div key={i} className="bg-green-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-green-900">
                              {entrada.descricao}
                            </p>
                            {entrada.categoria && (
                              <p className="text-sm text-green-600">
                                {
                                  categoriasDisponiveis.find(
                                    (c) => c.id === entrada.categoria
                                  )?.icone
                                }{' '}
                                {categoriasDisponiveis.find(
                                  (c) => c.id === entrada.categoria
                                )?.nome || entrada.categoria}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-900">
                              +{formatarMoeda(entrada.valor)}
                            </p>
                            <p className="text-xs text-green-600">
                              {entrada.hora}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma entrada registrada
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  Saídas
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {caixa.saidas && caixa.saidas.length > 0 ? (
                    caixa.saidas.map((saida, i) => (
                      <div key={i} className="bg-red-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-red-900">
                              {saida.descricao}
                            </p>
                            {saida.categoria && (
                              <p className="text-sm text-red-600">
                                {
                                  categoriasDisponiveis.find(
                                    (c) => c.id === saida.categoria
                                  )?.icone
                                }{' '}
                                {categoriasDisponiveis.find(
                                  (c) => c.id === saida.categoria
                                )?.nome || saida.categoria}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-900">
                              -{formatarMoeda(saida.valor)}
                            </p>
                            <p className="text-xs text-red-600">{saida.hora}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma saída registrada
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Abrir Caixa - Apenas Admin */}
        {user?.role === 'admin' && showAbrirModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🟢 Abrir Caixa - {formatarDataBrasileira(dataAtual)}
              </h3>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saldo Inicial *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    placeholder="0,00"
                    disabled={operacaoLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Observações sobre a abertura do caixa..."
                    disabled={operacaoLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAbrirModal(false);
                    setSaldoInicial('0');
                    setObservacoes('');
                  }}
                  className="w-full sm:flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={operacaoLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAbrirCaixa}
                  className="w-full sm:flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={operacaoLoading}
                >
                  {operacaoLoading ? 'Abrindo...' : 'Abrir Caixa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Fechar Caixa - Apenas Admin */}
        {user?.role === 'admin' && showFecharModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🔒 Fechar Caixa - {formatarDataBrasileira(dataAtual)}
              </h3>

              <div className="space-y-3 md:space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Resumo do Dia:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>Total de Entradas: <strong>{formatarMoeda(caixa?.totalEntradas || 0)}</strong></div>
                    <div>Total de Saídas: <strong>{formatarMoeda(caixa?.totalSaidas || 0)}</strong></div>
                    <div>Saldo Final: <strong>{formatarMoeda(caixa?.saldoDia || 0)}</strong></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações de Fechamento
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                    rows="3"
                    placeholder="Observações sobre o fechamento do caixa..."
                    disabled={operacaoLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFecharModal(false);
                    setObservacoes('');
                  }}
                  className="w-full sm:flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={operacaoLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFecharCaixa}
                  className="w-full sm:flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={operacaoLoading}
                >
                  {operacaoLoading ? 'Fechando...' : 'Fechar Caixa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
