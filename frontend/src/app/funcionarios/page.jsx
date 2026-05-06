'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ComissaoChart from '@/components/ComissaoChart';
import AgendamentosDetalhes from '@/components/AgendamentosDetalhes';
import HorarioTrabalho from '@/components/HorarioTrabalho';
import { formatarTelefone } from '@/utils/formatters';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';
import PhoneInput from '@/components/PhoneInput';

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
  const [funcionarioEditando, setFuncionarioEditando] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('informacoes');
  const [activeTabDetalhes, setActiveTabDetalhes] = useState('informacoes');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    usuario: '',
    cpf: '',
    cnpj: '',
    tipoDocumento: 'cpf', // 'cpf' ou 'cnpj'
    endereco: '',
    observacoes: '',
    cargo: 'funcionario',
    senha: '',
    comissao: '0',
    ativo: true,
    horarioTrabalho: {
      segunda: { ativo: true, inicio: '08:00', fim: '18:00' },
      terca: { ativo: true, inicio: '08:00', fim: '18:00' },
      quarta: { ativo: true, inicio: '08:00', fim: '18:00' },
      quinta: { ativo: true, inicio: '08:00', fim: '18:00' },
      sexta: { ativo: true, inicio: '08:00', fim: '18:00' },
      sabado: { ativo: true, inicio: '08:00', fim: '16:00' },
      domingo: { ativo: false, inicio: '08:00', fim: '16:00' }
    }
  });

  useEffect(() => {
    // Verificar usuário logado
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchFuncionarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error('Erro ao carregar funcionários');
      }

      const data = await res.json();
      if (data.success) {
        setFuncionarios(data.data || []);
      } else {
        setError(data.message || 'Erro ao carregar dados');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = funcionarioEditando 
        ? `${API_BASE_URL}/api/users/${funcionarioEditando._id}`
        : `${API_BASE_URL}/api/users`;
      
      const method = funcionarioEditando ? 'PUT' : 'POST';

      // Preparar dados baseados no role do usuário
      let dadosParaEnvio = { ...formData };

      // Se não for admin, remover campos que não devem ser editados
      if (user?.role !== 'admin') {
        delete dadosParaEnvio.comissao;
        // Se estiver editando, manter o cargo original
        if (funcionarioEditando) {
          dadosParaEnvio.cargo = funcionarioEditando.role;
        }
      } else {
        // Admin pode definir comissão
        dadosParaEnvio.comissao = parseFloat(formData.comissao) || 0;
      }

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(dadosParaEnvio)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao salvar funcionário');
      }

      const data = await res.json();
      if (data.success) {
        alert(funcionarioEditando ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!');
        setModalAberto(false);
        resetForm();
        await fetchFuncionarios();
      } else {
        throw new Error(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const editarFuncionario = (funcionario) => {
    setFuncionarioEditando(funcionario);

    const baseFormData = {
      nome: funcionario.nome || '',
      telefone: funcionario.telefone || '',
      email: funcionario.email || '',
      usuario: funcionario.usuario || '',
      cpf: funcionario.cpf || '',
      cnpj: funcionario.cnpj || '',
      tipoDocumento: funcionario.cnpj ? 'cnpj' : 'cpf',
      endereco: funcionario.endereco || '',
      observacoes: funcionario.observacoes || '',
      cargo: funcionario.role || 'funcionario',
      senha: '', // Não carregar senha existente por segurança
      ativo: funcionario.ativo !== false,
      horarioTrabalho: funcionario.horarioTrabalho || {
        segunda: { ativo: true, inicio: '08:00', fim: '18:00' },
        terca: { ativo: true, inicio: '08:00', fim: '18:00' },
        quarta: { ativo: true, inicio: '08:00', fim: '18:00' },
        quinta: { ativo: true, inicio: '08:00', fim: '18:00' },
        sexta: { ativo: true, inicio: '08:00', fim: '18:00' },
        sabado: { ativo: true, inicio: '08:00', fim: '16:00' },
        domingo: { ativo: false, inicio: '08:00', fim: '16:00' }
      }
    };

    // Apenas admin vê/edita comissão
    if (user?.role === 'admin') {
      baseFormData.comissao = funcionario.comissao?.toString() || '0';
    }

    setFormData(baseFormData);
    setModalAberto(true);
  };

  const deletarFuncionario = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao excluir funcionário');
      }

      alert('Funcionário excluído com sucesso!');
      await fetchFuncionarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    const baseFormData = {
      nome: '',
      telefone: '',
      email: '',
      usuario: '',
      cpf: '',
      cnpj: '',
      tipoDocumento: 'cpf',
      endereco: '',
      observacoes: '',
      cargo: 'funcionario',
      senha: '',
      ativo: true
    };

    // Apenas admin define comissão ao criar novo funcionário
    if (user?.role === 'admin') {
      baseFormData.comissao = '0';
    }

    setFormData(baseFormData);
    setFuncionarioEditando(null);
  };

  const abrirModalNovo = () => {
    resetForm();
    setModalAberto(true);
  };

  const abrirModalDetalhes = (funcionario) => {
    setFuncionarioSelecionado(funcionario);
    setModalDetalhesAberto(true);
  };

  const editarDoModal = (funcionario) => {
    setModalDetalhesAberto(false);
    editarFuncionario(funcionario);
  };

  const excluirDoModal = async (id) => {
    setModalDetalhesAberto(false);
    await deletarFuncionario(id);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'admin' ? 'Funcionários' : 'Minhas Informações'}
            </h1>
            <p className="text-gray-600">
              {user?.role === 'admin'
                ? 'Gerencie os funcionários da barbearia'
                : 'Visualize suas informações e comissões'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={abrirModalNovo}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors w-full sm:w-auto"
            >
              Novo Funcionário
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {funcionarios
            .filter((funcionario) => {
              // Se for admin, mostra todos. Se for funcionário, mostra apenas ele mesmo
              if (user?.role === 'admin') return true;

              // Comparar IDs como string para garantir compatibilidade
              const funcionarioId = String(funcionario._id);
              const userId = String(user?._id);
              const usuarioLogin = String(user?.usuario);

              return (
                funcionarioId === userId || funcionario.usuario === usuarioLogin
              );
            })
            .map((funcionario) => (
              <div
                key={funcionario._id}
                onClick={() => abrirModalDetalhes(funcionario)}
                className="bg-white rounded-lg shadow-md p-4 md:p-6 border hover:shadow-lg transition-all cursor-pointer hover:border-amber-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {funcionario.nome}
                    </h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                        funcionario.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : funcionario.role === 'manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {funcionario.role === 'admin'
                        ? '👑 Administrador'
                        : funcionario.role === 'manager'
                        ? '🏢 Gerente'
                        : '✂️ Barbeiro'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      funcionario.ativo !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {funcionario.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-2">
                  {funcionario.telefone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">📱 Telefone:</span>
                      <span className="text-sm text-gray-900">
                        {formatarTelefone(funcionario.telefone)}
                      </span>
                    </div>
                  )}

                  {funcionario.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">📧 E-mail:</span>
                      <span className="text-sm text-gray-900 truncate ml-2">
                        {funcionario.email}
                      </span>
                    </div>
                  )}

                  {funcionario.horarioTrabalho && (
                    <div className="mt-3">
                      <HorarioTrabalho
                        horarioTrabalho={funcionario.horarioTrabalho}
                        readOnly={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {funcionarios.filter((funcionario) => {
          if (user?.role === 'admin') return true;
          const funcionarioId = String(funcionario._id);
          const userId = String(user?._id);
          const usuarioLogin = String(user?.usuario);
          return (
            funcionarioId === userId || funcionario.usuario === usuarioLogin
          );
        }).length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">
              {user?.role === 'admin'
                ? 'Nenhum funcionário cadastrado'
                : 'Erro ao carregar suas informações'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {user?.role === 'admin'
                ? 'Clique em "Novo Funcionário" para começar'
                : 'Tente recarregar a página'}
            </p>
          </div>
        )}

        {/* Modal de Detalhes */}
        {modalDetalhesAberto && funcionarioSelecionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-5xl my-4 overflow-hidden shadow-xl">
              {/* Header com X */}
              <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {funcionarioSelecionado.nome}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {funcionarioSelecionado.role === 'admin'
                      ? '👑 Administrador'
                      : funcionarioSelecionado.role === 'manager'
                      ? '🏢 Gerente'
                      : '✂️ Barbeiro'}
                    {' • '}
                    {funcionarioSelecionado.ativo !== false ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModalDetalhesAberto(false);
                    setActiveTabDetalhes('informacoes');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-full"
                  aria-label="Fechar"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="bg-white border-b border-gray-200">
                <nav className="flex space-x-4 sm:space-x-8 px-4 md:px-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTabDetalhes('informacoes')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTabDetalhes === 'informacoes'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📝 Informações
                  </button>
                  <button
                    onClick={() => setActiveTabDetalhes('comissoes')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTabDetalhes === 'comissoes'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Comissões
                  </button>
                  <button
                    onClick={() => setActiveTabDetalhes('agendamentos')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTabDetalhes === 'agendamentos'
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📅 Agendamentos
                  </button>
                </nav>
              </div>

              {/* Conteúdo */}
              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                {/* Tab Informações */}
                {activeTabDetalhes === 'informacoes' && (
                  <div className="space-y-6">
                    {/* Informações de Contato */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        📞 Informações de Contato
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {funcionarioSelecionado.telefone && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Telefone:</span>
                            <span className="text-gray-900">
                              {formatarTelefone(funcionarioSelecionado.telefone)}
                            </span>
                          </div>
                        )}
                        {funcionarioSelecionado.email && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">E-mail:</span>
                            <span className="text-gray-900">
                              {funcionarioSelecionado.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documentos */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        🆔 Documentos
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {funcionarioSelecionado.cpf && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">CPF:</span>
                            <span className="text-gray-900">
                              {funcionarioSelecionado.cpf}
                            </span>
                          </div>
                        )}
                        {funcionarioSelecionado.cnpj && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">CNPJ:</span>
                            <span className="text-gray-900">
                              {funcionarioSelecionado.cnpj}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Endereço */}
                    {funcionarioSelecionado.endereco && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          📍 Endereço
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900">
                            {funcionarioSelecionado.endereco}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Horário de Trabalho */}
                    {funcionarioSelecionado.horarioTrabalho && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          🕐 Horário de Trabalho
                        </h3>
                        <HorarioTrabalho
                          horarioTrabalho={funcionarioSelecionado.horarioTrabalho}
                          readOnly={true}
                        />
                      </div>
                    )}

                    {/* Observações */}
                    {funcionarioSelecionado.observacoes && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          📝 Observações
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {funcionarioSelecionado.observacoes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Comissões */}
                {activeTabDetalhes === 'comissoes' && (
                  <div>
                    <ComissaoChart
                      funcionarioId={funcionarioSelecionado._id}
                      altura={500}
                    />
                  </div>
                )}

                {/* Tab Agendamentos */}
                {activeTabDetalhes === 'agendamentos' && (
                  <div>
                    <AgendamentosDetalhes
                      funcionarioId={funcionarioSelecionado._id}
                    />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-t border-gray-200">
                {user?.role === 'admin' && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => editarDoModal(funcionarioSelecionado)}
                      className="w-full sm:flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluirDoModal(funcionarioSelecionado._id)}
                      className="w-full sm:flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                )}
                {user?.role !== 'admin' &&
                  (String(funcionarioSelecionado._id) === String(user?._id) ||
                    funcionarioSelecionado.usuario === user?.usuario) && (
                    <button
                      onClick={() => editarDoModal(funcionarioSelecionado)}
                      className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Editar Minhas Informações
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-5xl my-4 overflow-hidden shadow-xl">
              {/* Header do Modal */}
              <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {funcionarioEditando
                    ? `${funcionarioEditando.nome}`
                    : 'Novo Funcionário'}
                </h2>
                {funcionarioEditando && (
                  <p className="text-sm text-gray-600 mt-1">
                    {funcionarioEditando.role === 'admin'
                      ? '👑 Administrador'
                      : funcionarioEditando.role === 'manager'
                      ? '🏢 Gerência'
                      : '✂️ Barbeiro'}{' '}
                    •{funcionarioEditando.ativo ? ' Ativo' : ' Inativo'}
                  </p>
                )}
              </div>

              {/* Tabs - Apenas para funcionários existentes */}
              {funcionarioEditando && (
                <div className="bg-white border-b border-gray-200">
                  <nav className="flex space-x-4 sm:space-x-8 px-4 md:px-6 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('informacoes')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'informacoes'
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      📝 Informações
                    </button>
                    <button
                      onClick={() => setActiveTab('comissoes')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'comissoes'
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      📊 Comissões
                    </button>
                    <button
                      onClick={() => setActiveTab('agendamentos')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'agendamentos'
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      📅 Agendamentos
                    </button>
                  </nav>
                </div>
              )}

              {/* Conteúdo do Modal */}
              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                {/* Tab Informações ou Novo Funcionário */}
                {(!funcionarioEditando || activeTab === 'informacoes') && (
                  <div>
                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({ ...formData, nome: e.target.value })
                          }
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone
                        </label>
                        <PhoneInput
                          value={formData.telefone}
                          onChange={(value) =>
                            setFormData({ ...formData, telefone: value })
                          }
                          placeholder="(00) 00000-0000"
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="funcionario@barbearia.com"
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Usuário *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.usuario}
                          onChange={(e) =>
                            setFormData({ ...formData, usuario: e.target.value })
                          }
                          placeholder="usuario.funcionario"
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Nome de usuário para login no sistema
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Documento *
                        </label>

                        {/* Seletor de tipo de documento */}
                        <div className="flex space-x-4 mb-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="tipoDocumento"
                              value="cpf"
                              checked={formData.tipoDocumento === 'cpf'}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  tipoDocumento: e.target.value,
                                  cpf: '',
                                  cnpj: '',
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">CPF</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="tipoDocumento"
                              value="cnpj"
                              checked={formData.tipoDocumento === 'cnpj'}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  tipoDocumento: e.target.value,
                                  cpf: '',
                                  cnpj: '',
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">CNPJ</span>
                          </label>
                        </div>

                        {/* Campo CPF */}
                        {formData.tipoDocumento === 'cpf' && (
                          <input
                            type="text"
                            value={formData.cpf}
                            onChange={(e) => {
                              // Aplicar máscara de CPF
                              let value = e.target.value.replace(/\D/g, '');
                              value = value.replace(/(\d{3})(\d)/, '$1.$2');
                              value = value.replace(/(\d{3})(\d)/, '$1.$2');
                              value = value.replace(
                                /(\d{3})(\d{1,2})$/,
                                '$1-$2'
                              );
                              setFormData({ ...formData, cpf: value });
                            }}
                            placeholder="000.000.000-00"
                            maxLength="14"
                            required
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        )}

                        {/* Campo CNPJ */}
                        {formData.tipoDocumento === 'cnpj' && (
                            <input
                              type="text"
                              value={formData.cnpj}
                              onChange={(e) => {
                                // Aplicar máscara de CNPJ
                                let value = e.target.value.replace(/\D/g, '');
                                value = value.replace(/(\d{2})(\d)/, '$1.$2');
                                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                                value = value.replace(/(\d{3})(\d)/, '$1/$2');
                                value = value.replace(
                                  /(\d{4})(\d{1,2})$/,
                                  '$1-$2'
                                );
                                setFormData({ ...formData, cnpj: value });
                              }}
                              placeholder="00.000.000/0000-00"
                              maxLength="18"
                              required
                              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={formData.endereco}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endereco: e.target.value,
                            })
                          }
                          placeholder="Rua, número, bairro, cidade"
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {funcionarioEditando
                            ? 'Nova Senha (opcional)'
                            : 'Senha *'}
                        </label>
                        <input
                          type="password"
                          required={!funcionarioEditando}
                          value={formData.senha}
                          onChange={(e) =>
                            setFormData({ ...formData, senha: e.target.value })
                          }
                          placeholder={
                            funcionarioEditando
                              ? 'Deixe vazio para manter a atual'
                              : 'Digite a senha'
                          }
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          minLength="6"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {funcionarioEditando
                            ? 'Deixe vazio para manter a senha atual'
                            : 'Mínimo 6 caracteres'}
                        </p>
                      </div>

                      {/* Campo Cargo - Apenas para Admin */}
                      {user?.role === 'admin' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo
                          </label>
                          <select
                            value={formData.cargo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                cargo: e.target.value,
                              })
                            }
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          >
                            <option value="funcionario">Funcionário</option>
                            <option value="manager">Gerente</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          value={formData.observacoes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              observacoes: e.target.value,
                            })
                          }
                          placeholder="Informações adicionais sobre o funcionário..."
                          rows="3"
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      {/* Horário de Trabalho */}
                      <HorarioTrabalho
                        horarioTrabalho={formData.horarioTrabalho}
                        setFormData={setFormData}
                        formData={formData}
                      />

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="ativo"
                          checked={formData.ativo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ativo: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="ativo"
                          className="ml-2 block text-sm text-gray-900"
                        >
                          Funcionário ativo
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                        <button
                          type="submit"
                          className="w-full sm:flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          {funcionarioEditando ? 'Atualizar' : 'Cadastrar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalAberto(false);
                            setActiveTab('informacoes');
                          }}
                          className="w-full sm:flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tab Comissões */}
                {funcionarioEditando && activeTab === 'comissoes' && (
                  <div>
                    <ComissaoChart
                      funcionarioId={funcionarioEditando._id}
                      altura={500}
                    />
                  </div>
                )}

                {/* Tab Agendamentos */}
                {funcionarioEditando && activeTab === 'agendamentos' && (
                  <div>
                    <AgendamentosDetalhes
                      funcionarioId={funcionarioEditando._id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
