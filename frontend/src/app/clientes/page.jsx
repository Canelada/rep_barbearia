'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { formatarTelefone } from '@/utils/formatters';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';
import PhoneInput from '@/components/PhoneInput';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cnpj: '',
    tipoDocumento: 'cpf', // 'cpf' ou 'cnpj'
    dataAniversario: '', // DD/MM format
    servicoPreferido: '',
    observacoes: '',
    assinante: false
  });

  useEffect(() => {
    fetchClientes();
    fetchServicos();
  }, []);

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/clientes`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        setClientes(data.data || []);
      } else {
        setError(data.message || 'Erro ao carregar dados');
      }
    } catch (err) {
      setError(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchServicos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/servicos`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServicos(data.data || []);
        }
      }
    } catch (err) {
      // Erro silencioso - serviços não são críticos
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = clienteEditando
        ? `${API_BASE_URL}/api/clientes/${clienteEditando._id}`
        : `${API_BASE_URL}/api/clientes`;
      
      const method = clienteEditando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao salvar cliente');
      }

      const data = await res.json();
      if (data.success) {
        alert(clienteEditando ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
        setModalAberto(false);
        resetForm();
        await fetchClientes();
      } else {
        throw new Error(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const editarCliente = (cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      cpf: cliente.cpf || '',
      cnpj: cliente.cnpj || '',
      tipoDocumento: cliente.cnpj ? 'cnpj' : 'cpf',
      dataAniversario: cliente.dataAniversario || '',
      servicoPreferido: typeof cliente.servicoPreferido === 'object' ? cliente.servicoPreferido?._id || '' : cliente.servicoPreferido || '',
      observacoes: cliente.observacoes || '',
      assinante: cliente.assinante || false
    });
    setModalAberto(true);
  };

  const deletarCliente = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/clientes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao excluir cliente');
      }

      alert('Cliente excluído com sucesso!');
      await fetchClientes();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      cnpj: '',
      tipoDocumento: 'cpf',
      dataAniversario: '',
      servicoPreferido: '',
      observacoes: '',
      assinante: false
    });
    setClienteEditando(null);
  };

  const abrirModalNovo = () => {
    resetForm();
    setModalAberto(true);
  };

  const formatarDataAniversario = (value) => {
    const numero = value.replace(/\D/g, '');

    if (numero.length >= 3) {
      return numero.slice(0, 2) + '/' + numero.slice(2, 4);
    }
    return numero;
  };

  const handleDataAniversarioChange = (e) => {
    const formatted = formatarDataAniversario(e.target.value);
    setFormData({...formData, dataAniversario: formatted});
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
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600">
              Gerencie os dados dos clientes da barbearia
            </p>
          </div>
          <button
            onClick={abrirModalNovo}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
          >
            👤 Novo Cliente
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Telefone
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Aniversário
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Serviço Pref.
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Assinante
                </th>
                <th className="px-2 md:px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientes.map((cliente) => (
                <tr key={cliente._id}>
                  <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.nome}
                      </div>
                      {cliente.observacoes && (
                        <div className="text-sm text-gray-500">
                          {cliente.observacoes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                    {formatarTelefone(cliente.telefone)}
                  </td>
                  <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                    {cliente.dataAniversario || '-'}
                  </td>
                  <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                    {cliente.servicoPreferidoNome ||
                      cliente.servicoPreferido?.nome ||
                      (typeof cliente.servicoPreferido === 'string'
                        ? cliente.servicoPreferido
                        : '') ||
                      '-'}
                  </td>
                  <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cliente.assinante
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cliente.assinante ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-2 md:px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => editarCliente(cliente)}
                        className="text-purple-600 hover:text-purple-900 text-xs md:text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deletarCliente(cliente._id)}
                        className="text-red-600 hover:text-red-900 text-xs md:text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {clientes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum cliente cadastrado</p>
              <p className="text-gray-400 text-sm mt-2">
                Clique em &quot;Novo Cliente&quot; para começar
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva Santos"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <PhoneInput
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(value) =>
                      setFormData({ ...formData, telefone: value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento
                  </label>

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

                  {formData.tipoDocumento === 'cpf' && (
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setFormData({ ...formData, cpf: value });
                      }}
                      placeholder="000.000.000-00"
                      maxLength="14"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  )}

                  {formData.tipoDocumento === 'cnpj' && (
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        value = value.replace(/(\d{2})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1/$2');
                        value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
                        setFormData({ ...formData, cnpj: value });
                      }}
                      placeholder="00.000.000/0000-00"
                      maxLength="18"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Aniversário (Dia/Mês)
                  </label>
                  <input
                    type="text"
                    placeholder="15/03"
                    maxLength="5"
                    value={formData.dataAniversario}
                    onChange={handleDataAniversarioChange}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Formato: DD/MM</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serviço Preferido
                  </label>
                  <select
                    value={formData.servicoPreferido}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        servicoPreferido: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Selecione um serviço</option>
                    {servicos.map((servico) => (
                      <option key={servico._id} value={servico._id}>
                        {servico.nome} - {servico.categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    placeholder="Informações adicionais sobre o cliente..."
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows="3"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="assinante"
                    checked={formData.assinante}
                    onChange={(e) =>
                      setFormData({ ...formData, assinante: e.target.checked })
                    }
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="assinante"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    ⭐ Cliente Assinante
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    {clienteEditando ? 'Atualizar' : 'Cadastrar'}
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
      </div>
    </Layout>
  );
}
