'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { formatarMoeda } from '@/utils/formatters';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';

export default function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estatisticasCategorias, setEstatisticasCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [categoriasFiltro, setCategoriasFiltro] = useState('todas');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: 'Corte Masculino',
    preco: '0',
    duracaoMin: '30',
    comissao: '0',
    ativo: true,
  });

  // Categorias padrão que não podem ser excluídas
  const categoriasDefault = [
    'Corte Masculino',
    'Barba',
    'Combo',
    'Tratamento',
    'Infantil',
    'Especial',
  ];

  useEffect(() => {
    fetchServicos();
    fetchCategorias();
    fetchEstatisticasCategorias();
  }, []);

  const fetchServicos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/servicos`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        setServicos(data.data || []);
      } else {
        setError(data.message || 'Erro ao carregar dados');
      }
    } catch (err) {
      setError(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categorias`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        setCategorias(data.data || []);

        // Definir categoria padrão se não existir no formData
        if (data.data?.length > 0 && !data.data.includes(formData.categoria)) {
          setFormData((prev) => ({ ...prev, categoria: data.data[0] }));
        }
      }
    } catch (err) {
      // Fallback para categorias padrão
      setCategorias([
        'Corte Masculino',
        'Barba',
        'Combo',
        'Infantil',
        'Tratamento',
        'Especial',
        'Outros',
      ]);
    }
  };

  const fetchEstatisticasCategorias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categorias/estatisticas`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setEstatisticasCategorias(data.data.servicosPorCategoria || []);
      }
    } catch (err) {
      // Erro silencioso nas estatísticas
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = servicoEditando
        ? `${API_BASE_URL}/api/servicos/${servicoEditando._id}`
        : `${API_BASE_URL}/api/servicos`;

      const method = servicoEditando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          preco: parseFloat(formData.preco) || 0,
          duracaoMin: parseInt(formData.duracaoMin) || 30,
          comissao: parseFloat(formData.comissao) || 0,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao salvar serviço');
      }

      const data = await res.json();
      if (data.success) {
        alert(
          servicoEditando
            ? 'Serviço atualizado com sucesso!'
            : 'Serviço cadastrado com sucesso!'
        );
        setModalAberto(false);
        resetForm();
        await fetchServicos();
      } else {
        throw new Error(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const editarServico = (servico) => {
    setServicoEditando(servico);
    setFormData({
      nome: servico.nome || '',
      descricao: servico.descricao || '',
      categoria: servico.categoria || 'Corte Masculino',
      preco: servico.preco?.toString() || '0',
      duracaoMin: servico.duracaoMin?.toString() || '30',
      comissao: servico.comissao?.toString() || '0',
      ativo: servico.ativo !== false,
    });
    setModalAberto(true);
  };

  const deletarServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/servicos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao excluir serviço');
      }

      alert('Serviço excluído com sucesso!');
      await fetchServicos();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      categoria: 'Corte Masculino',
      preco: '0',
      duracaoMin: '30',
      comissao: '0',
      ativo: true,
    });
    setServicoEditando(null);
    setError('');
  };

  const abrirModalNovo = () => {
    resetForm();
    setModalAberto(true);
  };

  const abrirModalCategoria = () => {
    setNovaCategoria('');
    setModalCategoriaAberto(true);
  };

  const adicionarCategoria = async (e) => {
    e.preventDefault();

    if (!novaCategoria.trim()) {
      alert('Nome da categoria é obrigatório');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/categorias`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nome: novaCategoria.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao adicionar categoria');
      }

      if (data.success) {
        alert(
          'Categoria criada com sucesso! Agora você pode usá-la ao criar serviços.'
        );
        setModalCategoriaAberto(false);
        setNovaCategoria('');
        await fetchCategorias();
        await fetchEstatisticasCategorias();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const deletarCategoria = async (categoria) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoria}"?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/categorias/${encodeURIComponent(categoria)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao excluir categoria');
      }

      alert('Categoria excluída com sucesso!');

      // Se estava filtrando pela categoria deletada, voltar para "todas"
      if (categoriasFiltro === categoria) {
        setCategoriasFiltro('todas');
      }

      await fetchCategorias();
      await fetchEstatisticasCategorias();
    } catch (err) {
      alert(err.message);
    }
  };

  const servicosFiltrados =
    categoriasFiltro === 'todas'
      ? servicos
      : servicos.filter((s) => s.categoria === categoriasFiltro);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Categorias / Serviços
            </h1>
            <p className="text-gray-600">
              Gerencie as categorias e serviços oferecidos pela barbearia
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={abrirModalCategoria}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              📁 Nova Categoria
            </button>
            <button
              onClick={abrirModalNovo}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              ✂️ Novo Serviço
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Seção de Categorias */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📂 Categorias ({categorias.length})
          </h2>

          <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
            <button
              onClick={() => setCategoriasFiltro('todas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoriasFiltro === 'todas'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos ({servicos.length})
            </button>
            {categorias.map((cat) => {
              const stats = estatisticasCategorias.find(
                (e) => e.categoria === cat
              );
              const total = stats?.total || 0;
              const isDefault = categoriasDefault.includes(cat);

              return (
                <div key={cat} className="relative inline-block">
                  <button
                    onClick={() => setCategoriasFiltro(cat)}
                    className={`px-4 py-2 ${!isDefault ? 'pr-8' : ''} rounded-lg font-medium transition-colors ${
                      categoriasFiltro === cat
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat} ({total})
                  </button>
                  {!isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletarCategoria(cat);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                      title="Excluir categoria"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Seção de Serviços */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            ✂️ Serviços
            {categoriasFiltro !== 'todas' && (
              <span className="text-base font-normal text-gray-600 ml-2">
                - Categoria: {categoriasFiltro}
              </span>
            )}
          </h2>
          <p className="text-gray-600 text-sm">
            {servicosFiltrados.length} serviço(s) encontrado(s)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {servicosFiltrados.map((servico) => (
            <div
              key={servico._id}
              className="bg-white rounded-lg shadow-md p-4 border hover:shadow-lg transition-shadow relative max-w-sm"
            >
              {/* Botão X de excluir no canto superior direito */}
              <button
                onClick={() => deletarServico(servico._id)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-colors text-lg font-bold"
                title="Excluir serviço"
              >
                ×
              </button>

              <div className="flex justify-between items-start mb-3 pr-7">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {servico.nome}
                  </h3>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 mt-1">
                    {servico.categoria}
                  </span>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    servico.ativo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {servico.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {servico.descricao && (
                <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                  {servico.descricao}
                </p>
              )}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-semibold text-green-600">
                    {formatarMoeda(servico.preco)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duração:</span>
                  <span className="font-medium">{servico.duracaoMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Comissão:</span>
                  <span className="font-medium">{servico.comissao || 0}%</span>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => editarServico(servico)}
                  className="w-full bg-green-600 text-white py-1.5 px-3 rounded hover:bg-green-700 transition-colors text-sm"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>

        {servicosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">
              {categoriasFiltro === 'todas'
                ? 'Nenhum serviço cadastrado'
                : `Nenhum serviço encontrado na categoria "${categoriasFiltro}"`}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {categoriasFiltro === 'todas'
                ? 'Clique em "Novo Serviço" para começar'
                : 'Tente selecionar outra categoria ou clique em "Todas"'}
            </p>
          </div>
        )}

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {servicoEditando ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Corte Masculino"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    placeholder="Descrição do serviço (opcional)"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.preco}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setFormData({ ...formData, preco: '' });
                        } else {
                          setFormData({ ...formData, preco: value });
                        }
                      }}
                      onFocus={(e) => {
                        if (e.target.value === '0') {
                          setFormData({ ...formData, preco: '' });
                        }
                      }}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duração (min) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="30"
                      value={formData.duracaoMin}
                      onChange={(e) =>
                        setFormData({ ...formData, duracaoMin: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.comissao}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '0') {
                        setFormData({ ...formData, comissao: '' });
                      } else {
                        setFormData({ ...formData, comissao: value });
                      }
                    }}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        setFormData({ ...formData, comissao: '' });
                      }
                    }}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual de comissão para o funcionário (0-100%)
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) =>
                      setFormData({ ...formData, ativo: e.target.checked })
                    }
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="ativo"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Serviço ativo
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {servicoEditando ? 'Atualizar' : 'Cadastrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="w-full sm:flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nova Categoria */}
        {modalCategoriaAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Nova Categoria</h2>

              <form onSubmit={adicionarCategoria} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Serviços Premium"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    maxLength="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 50 caracteres. Use apenas letras, números, espaços e
                    hífens.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCategoriaAberto(false)}
                    className="w-full sm:flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
