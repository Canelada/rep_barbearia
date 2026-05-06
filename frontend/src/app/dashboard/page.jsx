'use client'
import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import Layout from '@/components/Layout';
import CalendarHeader from '@/components/CalendarHeader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  formatarMoeda,
  formatarDataBrasileira,
  formatarDataHoraBrasileira,
  formatarHoraBrasileira,
  formatarTelefone,
} from '@/utils/formatters';
import apiService from '@/services/api';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mesAtual, setMesAtual] = useState(null);
  const [anoAtual, setAnoAtual] = useState(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Inicializar mês e ano no cliente
    const now = new Date();
    setMesAtual(now.getMonth() + 1);
    setAnoAtual(now.getFullYear());
  }, []);

  useEffect(() => {
    // Carregar dados do usuário logado
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (mesAtual && anoAtual) {
      fetchDashboardData();
    }
  }, [mesAtual, anoAtual]);

  const fetchDashboardData = async () => {
    if (!mesAtual || !anoAtual) return;
    setLoading(true);
    try {
      const data = await apiService.getDashboardData(mesAtual, anoAtual);
      setDashboardData(data.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Navegação entre meses
  const navegarMes = (direcao) => {
    let novoMes = mesAtual;
    let novoAno = anoAtual;

    if (direcao === 'anterior') {
      novoMes = mesAtual - 1;
      if (novoMes < 1) {
        novoMes = 12;
        novoAno = anoAtual - 1;
      }
    } else if (direcao === 'proximo') {
      novoMes = mesAtual + 1;
      if (novoMes > 12) {
        novoMes = 1;
        novoAno = anoAtual + 1;
      }
    }

    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  };

  const irParaMesAtual = () => {
    setMesAtual(new Date().getMonth() + 1);
    setAnoAtual(new Date().getFullYear());
  };

  // Criar uma data fictícia para o header baseada no mês/ano atual
  const dataHeader = new Date(anoAtual, mesAtual - 1, 1);

  const nomesMeses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const cores = [
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#ef4444',
    '#8b5cf6',
    '#f97316',
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </Layout>
    );
  }

  const {
    resumo,
    proximoAgendamento,
    proximosAgendamentos,
    produtosBaixoEstoque,
    servicosMaisProcurados,
    performanceBarbeiros,
    evolucaoReceita,
    agendamentosPorStatus,
    movimentacaoRecentes,
    resumoPorCategoria,
    comparativos,
  } = dashboardData || {};

  // Dados para gráfico de pizza - serviços
  const dadosPieServicos =
    servicosMaisProcurados?.map((servico, index) => ({
      name: servico.nome,
      value: servico.quantidade,
      receita: servico.receita,
      fill: cores[index % cores.length],
    })) || [];

  // Dados para gráfico de área - receita por dia
  const dadosAreaReceita =
    evolucaoReceita?.map((item) => ({
      dia: `${item.data.split('-')[2]}`,
      receita: item.receita,
    })) || [];

  // Dados para gráfico de pizza - formas de pagamento
  const formasPagamento = dashboardData?.formasPagamento || [];
  const dadosPieFormasPagamento = formasPagamento.map((forma, index) => ({
    name: forma.nome,
    value: forma.quantidade,
    total: forma.total,
    fill: cores[index % cores.length],
  }));

  // Mapear ícones para formas de pagamento
  const iconesFormaPagamento = {
    'Dinheiro': '💵',
    'PIX': '📱',
    'Cartão de Crédito': '💳',
    'Cartão de Débito': '💳',
    'Outros': '💼'
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <CalendarHeader
          title="Dashboard"
          subtitle="Visão geral do desempenho da barbearia"
          date={dataHeader}
          mode="month"
          onNavigate={(newDate) => {
            setMesAtual(newDate.getMonth() + 1);
            setAnoAtual(newDate.getFullYear());
          }}
          onToday={irParaMesAtual}
        >
          <button
            onClick={fetchDashboardData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Atualizar
          </button>
        </CalendarHeader>

        {/* Cards de Resumo Principais - Apenas Admin e Gerente */}
        {(user?.role === 'admin' || user?.role === 'gerente') && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Agendamentos do Mês
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {resumo?.agendamentosMes || 0}
                  </p>
                  {comparativos?.agendamentos && (
                    <p
                      className={`text-sm ${
                        comparativos.agendamentos.variacao >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {comparativos.agendamentos.variacao >= 0 ? '↗' : '↘'}
                      {Math.abs(comparativos.agendamentos.variacao)}% vs mês
                      anterior
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Receita do Mês
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {formatarMoeda(resumo?.receitaMes || 0)}
                  </p>
                  {comparativos?.receita && (
                    <p
                      className={`text-sm ${
                        comparativos.receita.variacao >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {comparativos.receita.variacao >= 0 ? '↗' : '↘'}
                      {Math.abs(comparativos.receita.variacao)}% vs mês anterior
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Lucro do Mês
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {formatarMoeda(resumo?.lucroMes || 0)}
                  </p>
                  {comparativos?.lucro && (
                    <p
                      className={`text-sm ${
                        comparativos.lucro.variacao >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {comparativos.lucro.variacao >= 0 ? '↗' : '↘'}
                      {Math.abs(comparativos.lucro.variacao)}% vs mês anterior
                    </p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Taxa de Ocupação
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {resumo?.taxaOcupacao || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Confirmados/Concluídos</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards de Hoje */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Agendamentos Hoje
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {resumo?.agendamentosHoje || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Confirmados Hoje
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {resumo?.agendamentosConfirmadosHoje || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Receita Hoje
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {formatarMoeda(resumo?.receitaHoje || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de Receita por Dia */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Receita Diária - {nomesMeses[mesAtual - 1]}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dadosAreaReceita}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value) => [formatarMoeda(value), 'Receita']}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Serviços Mais Procurados */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Serviços Mais Procurados
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPieServicos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPieServicos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Formas de Pagamento - Apenas Admin e Gerente */}
        {(user?.role === 'admin' || user?.role === 'gerente') && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Formas de Pagamento - {nomesMeses[mesAtual - 1]}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Pizza */}
              <div className="flex items-center justify-center">
                {dadosPieFormasPagamento.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosPieFormasPagamento}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPieFormasPagamento.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${value} pagamentos (${formatarMoeda(props.payload.total)})`,
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl">💳</span>
                    <p className="text-gray-500 mt-2">Sem dados de pagamento</p>
                  </div>
                )}
              </div>

              {/* Lista de Formas de Pagamento */}
              <div className="flex flex-col justify-center space-y-3">
                {dadosPieFormasPagamento.length > 0 ? (
                  dadosPieFormasPagamento.map((forma, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: forma.fill }}
                        ></div>
                        <span className="text-2xl">
                          {iconesFormaPagamento[forma.name] || '💼'}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {forma.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {forma.value} pagamento{forma.value !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatarMoeda(forma.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {dadosPieFormasPagamento.reduce((sum, f) => sum + f.total, 0) > 0
                            ? ((forma.total / dadosPieFormasPagamento.reduce((sum, f) => sum + f.total, 0)) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Nenhuma forma de pagamento registrada neste mês
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ranking de Barbeiros */}
        {performanceBarbeiros && performanceBarbeiros.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance dos Barbeiros - {nomesMeses[mesAtual - 1]}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceBarbeiros}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'receita' ? formatarMoeda(value) : value,
                    name === 'receita' ? 'Receita' : 'Atendimentos',
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="atendimentos"
                  fill="#3b82f6"
                  name="Atendimentos"
                />
                <Bar
                  yAxisId="right"
                  dataKey="receita"
                  fill="#10b981"
                  name="Receita"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Próximos Agendamentos */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Agendamentos do Mês
              </h3>
              <span className="text-sm text-gray-500">
                {proximosAgendamentos?.length || 0} agendamentos
              </span>
            </div>

            {proximosAgendamentos && proximosAgendamentos.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {proximosAgendamentos.map((agendamento, index) => (
                  <div
                    key={agendamento._id || index}
                    className="cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-3 border border-gray-200 hover:border-amber-300"
                    onClick={() => setSelectedAgendamento(agendamento)}
                  >
                    {/* Linha 1: Cliente e Status */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-600 font-semibold text-sm">
                            {agendamento.clienteNome?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {agendamento.clienteNome}
                          </h4>
                          {agendamento.clienteTelefone && (
                            <p className="text-xs text-gray-600">
                              {formatarTelefone(agendamento.clienteTelefone)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agendamento.status === 'confirmado'
                            ? 'bg-green-100 text-green-800'
                            : agendamento.status === 'agendado'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agendamento.status}
                      </span>
                    </div>

                    {/* Linha 2: Serviço e Barbeiro */}
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">✂️</span>
                        <span className="text-gray-700">
                          {agendamento.servicoNome ||
                            agendamento.servicoId?.nome}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">👨‍💼</span>
                        <span className="text-gray-600">
                          {agendamento.funcionarioNome ||
                            agendamento.funcionarioId?.nome}
                        </span>
                      </div>
                    </div>

                    {/* Linha 3: Data/Hora e Valor */}
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">📅</span>
                        <span className="font-medium text-gray-900">
                          {formatarDataBrasileira(agendamento.dataHora)}
                        </span>
                        <span className="text-gray-600">
                          às {formatarHoraBrasileira(agendamento.dataHora)}
                        </span>
                      </div>
                      <span className="font-bold text-amber-600">
                        {formatarMoeda(agendamento.preco || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-6xl">📅</span>
                <p className="text-gray-500 mt-2">Nenhum agendamento próximo</p>
              </div>
            )}
          </div>

          {/* Movimentações Recentes */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Movimentações Recentes
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {movimentacaoRecentes && movimentacaoRecentes.length > 0 ? (
                movimentacaoRecentes.map((mov, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-lg ${
                          mov.tipo === 'entrada' ? '💰' : '💸'
                        }`}
                      >
                        {mov.tipo === 'entrada' ? '💰' : '💸'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {mov.descricao}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatarDataBrasileira(mov.data)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-medium ${
                        mov.tipo === 'entrada'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {mov.tipo === 'entrada' ? '+' : '-'}
                      {formatarMoeda(mov.valor)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <span className="text-6xl">💼</span>
                  <p className="text-gray-500 mt-2">
                    Nenhuma movimentação recente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Produtos em Baixo Estoque */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Produtos em Baixo Estoque
              {resumo?.produtosBaixoEstoque > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {resumo.produtosBaixoEstoque}
                </span>
              )}
            </h3>
            {produtosBaixoEstoque && produtosBaixoEstoque.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {produtosBaixoEstoque.map((produto, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-4 border-red-400"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {produto.nome}
                      </p>
                      <p className="text-sm text-gray-600">
                        Mínimo: {produto.quantidadeMinima}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold text-lg">
                        {produto.quantidadeAtual}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-6xl">✅</span>
                <p className="text-green-600 mt-2 font-medium">
                  Todos os produtos com estoque adequado
                </p>
              </div>
            )}
          </div>

          {/* Resumo Financeiro Detalhado */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resumo Financeiro - {nomesMeses[mesAtual - 1]}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📈</span>
                  <span className="font-medium text-gray-700">Entradas</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatarMoeda(resumo?.receitaMes || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📉</span>
                  <span className="font-medium text-gray-700">Saídas</span>
                </div>
                <span className="font-bold text-red-600">
                  {formatarMoeda(resumo?.despesasMes || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💎</span>
                  <span className="font-bold text-gray-700">Lucro Líquido</span>
                </div>
                <span
                  className={`font-bold text-xl ${
                    (resumo?.lucroMes || 0) >= 0
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatarMoeda(resumo?.lucroMes || 0)}
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Taxa de Ocupação:
                  </span>
                  <span className="font-medium">
                    {resumo?.taxaOcupacao || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">
                    Produtos em Baixo Estoque:
                  </span>
                  <span className="font-medium">
                    {resumo?.produtosBaixoEstoque || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Agendamento */}
      <Dialog
        open={!!selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Detalhes do Agendamento
                </Dialog.Title>
                <button
                  onClick={() => setSelectedAgendamento(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {selectedAgendamento && (
                <div className="space-y-4">
                  {/* Cliente */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-600 font-bold text-xl">
                        {selectedAgendamento.clienteNome
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {selectedAgendamento.clienteNome}
                      </h3>
                      {selectedAgendamento.clienteTelefone && (
                        <p className="text-gray-600">
                          📞{' '}
                          {formatarTelefone(
                            selectedAgendamento.clienteTelefone
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Informações do Serviço */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="border-l-4 border-amber-500 pl-4">
                      <p className="text-sm font-medium text-gray-600">
                        Serviço
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedAgendamento.servicoNome ||
                          selectedAgendamento.servicoId?.nome}
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                      <p className="text-sm font-medium text-gray-600">
                        Barbeiro
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedAgendamento.funcionarioNome ||
                          selectedAgendamento.funcionarioId?.nome}
                      </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <p className="text-sm font-medium text-gray-600">
                        Data e Hora
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatarDataBrasileira(selectedAgendamento.dataHora)}
                      </p>
                      <p className="text-gray-600">
                        às{' '}
                        {formatarHoraBrasileira(selectedAgendamento.dataHora)}
                      </p>
                    </div>

                    <div className="border-l-4 border-purple-500 pl-4">
                      <p className="text-sm font-medium text-gray-600">Valor</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatarMoeda(
                          selectedAgendamento.valor ||
                            selectedAgendamento.preco ||
                            selectedAgendamento.servicoId?.preco ||
                            0
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        selectedAgendamento.status === 'confirmado'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : selectedAgendamento.status === 'agendado'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : selectedAgendamento.status === 'concluido'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      Status: {selectedAgendamento.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Observações */}
                  {selectedAgendamento.observacoes && (
                    <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded-r-lg">
                      <p className="text-sm font-medium text-gray-600">
                        Observações
                      </p>
                      <p className="text-gray-900 mt-1">
                        {selectedAgendamento.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setSelectedAgendamento(null)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => {
                        // Aqui você pode adicionar ação para editar/ir para agenda
                        window.location.href = '/agenda';
                      }}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Ver na Agenda
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Layout>
  );
}