'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Layout from '@/components/Layout'
import { API_BASE_URL } from '@/services/api';

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({
    entidade: '',
    acao: '',
    usuarioId: '',
    dataInicio: '',
    dataFim: ''
  })
  const [paginacao, setPaginacao] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [estatisticas, setEstatisticas] = useState(null)
  const [logSelecionado, setLogSelecionado] = useState(null)
  const [usuarios, setUsuarios] = useState([])

  const entidades = [
    { value: '', label: 'Todas' },
    { value: 'usuario', label: 'Usuários' },
    { value: 'agendamento', label: 'Agendamentos' },
    { value: 'servico', label: 'Serviços' },
    { value: 'cliente', label: 'Clientes' },
    { value: 'produto', label: 'Produtos' },
    { value: 'caixa', label: 'Caixa' },
    { value: 'auth', label: 'Autenticação' }
  ]

  const acoes = [
    { value: '', label: 'Todas' },
    { value: 'criar', label: 'Criar' },
    { value: 'atualizar', label: 'Atualizar' },
    { value: 'excluir', label: 'Excluir' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'status', label: 'Alteração de Status' },
    { value: 'movimentar', label: 'Movimentação' }
  ]

  const getAcaoIcon = (acao) => {
    const icons = {
      criar: '➕',
      atualizar: '✏️',
      excluir: '🗑️',
      login: '🔐',
      logout: '🚪',
      status: '🔄',
      movimentar: '📦'
    }
    return icons[acao] || '📝'
  }

  const getAcaoColor = (acao) => {
    const colors = {
      criar: 'bg-green-100 text-green-800',
      atualizar: 'bg-blue-100 text-blue-800',
      excluir: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800',
      status: 'bg-yellow-100 text-yellow-800',
      movimentar: 'bg-orange-100 text-orange-800'
    }
    return colors[acao] || 'bg-gray-100 text-gray-800'
  }

  const getEntidadeIcon = (entidade) => {
    const icons = {
      usuario: '👤',
      agendamento: '📅',
      servico: '✂️',
      cliente: '👥',
      produto: '📦',
      caixa: '💰',
      auth: '🔒'
    }
    return icons[entidade] || '📄'
  }

  useEffect(() => {
    buscarLogs()
    buscarEstatisticas()
    buscarUsuarios()
  }, [paginacao.page, filtros])

  const buscarLogs = async () => {
    setLoading(true)
    setErro('')

    try {
      const params = new URLSearchParams({
        page: paginacao.page.toString(),
        limit: paginacao.limit.toString()
      })

      if (filtros.entidade) params.append('entidade', filtros.entidade)
      if (filtros.acao) params.append('acao', filtros.acao)
      if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId)
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio)
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim)

      const response = await fetch(`${API_BASE_URL}/api/audit-logs?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar logs')
      }

      const result = await response.json()

      if (result.success) {
        setLogs(result.data)
        setPaginacao(prev => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      setErro('Erro ao carregar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }

  const buscarEstatisticas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/audit-logs/estatisticas`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setEstatisticas(result.data)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const buscarUsuarios = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUsuarios(result.data || [])
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
    setPaginacao(prev => ({ ...prev, page: 1 }))
  }

  const limparFiltros = () => {
    setFiltros({
      entidade: '',
      acao: '',
      usuarioId: '',
      dataInicio: '',
      dataFim: ''
    })
    setPaginacao(prev => ({ ...prev, page: 1 }))
  }

  const formatarData = (data) => {
    if (!data) return 'N/A'
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const renderDiff = (anterior, novo) => {
    if (!anterior && !novo) return null

    return (
      <div className="mt-4 space-y-4">
        {anterior && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2">Dados Anteriores:</h4>
            <pre className="bg-red-50 p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(anterior, null, 2)}
            </pre>
          </div>
        )}
        {novo && (
          <div>
            <h4 className="text-sm font-medium text-green-600 mb-2">Dados Novos:</h4>
            <pre className="bg-green-50 p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(novo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
            <p className="text-gray-600 mt-1">Histórico de todas as operações do sistema</p>
          </div>
        </div>

        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{estatisticas.total || 0}</div>
              <div className="text-sm text-gray-600">Total de Logs</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-2xl font-bold text-green-600">{estatisticas.hoje || 0}</div>
              <div className="text-sm text-gray-600">Logs Hoje</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-2xl font-bold text-purple-600">{estatisticas.semana || 0}</div>
              <div className="text-sm text-gray-600">Últimos 7 dias</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-2xl font-bold text-orange-600">{estatisticas.mes || 0}</div>
              <div className="text-sm text-gray-600">Último mês</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entidade</label>
              <select
                value={filtros.entidade}
                onChange={(e) => handleFiltroChange('entidade', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {entidades.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
              <select
                value={filtros.acao}
                onChange={(e) => handleFiltroChange('acao', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {acoes.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
              <select
                value={filtros.usuarioId}
                onChange={(e) => handleFiltroChange('usuarioId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos</option>
                {usuarios.map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={limparFiltros}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {/* Lista de Logs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Carregando logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-4xl">📋</span>
              <p className="mt-2">Nenhum log encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalhes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatarData(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAcaoColor(log.acao)}`}>
                            {getAcaoIcon(log.acao)} {log.acao}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center">
                            {getEntidadeIcon(log.entidade)} <span className="ml-1 capitalize">{log.entidade}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.entidadeNome || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.usuarioNome || 'Sistema'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.detalhes}>
                          {log.detalhes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setLogSelecionado(log)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {((paginacao.page - 1) * paginacao.limit) + 1} a {Math.min(paginacao.page * paginacao.limit, paginacao.total)} de {paginacao.total} logs
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPaginacao(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={paginacao.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Página {paginacao.page} de {paginacao.totalPages}
                  </span>
                  <button
                    onClick={() => setPaginacao(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={paginacao.page >= paginacao.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de Detalhes */}
        {logSelecionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Detalhes do Log</h3>
                  <button
                    onClick={() => setLogSelecionado(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data/Hora</label>
                      <p className="text-gray-900">{formatarData(logSelecionado.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ação</label>
                      <p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAcaoColor(logSelecionado.acao)}`}>
                          {getAcaoIcon(logSelecionado.acao)} {logSelecionado.acao}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Entidade</label>
                      <p className="text-gray-900 capitalize">
                        {getEntidadeIcon(logSelecionado.entidade)} {logSelecionado.entidade}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registro</label>
                      <p className="text-gray-900">{logSelecionado.entidadeNome || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Usuário</label>
                      <p className="text-gray-900">{logSelecionado.usuarioNome || 'Sistema'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">IP</label>
                      <p className="text-gray-900">{logSelecionado.ip || '-'}</p>
                    </div>
                  </div>

                  {logSelecionado.detalhes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Detalhes</label>
                      <p className="text-gray-900 mt-1">{logSelecionado.detalhes}</p>
                    </div>
                  )}

                  {logSelecionado.userAgent && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">User Agent</label>
                      <p className="text-gray-600 text-xs mt-1 break-all">{logSelecionado.userAgent}</p>
                    </div>
                  )}

                  {renderDiff(logSelecionado.dadosAnteriores, logSelecionado.dadosNovos)}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setLogSelecionado(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
