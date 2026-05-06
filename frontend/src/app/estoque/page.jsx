'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';

export default function EstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null); // ID do produto sendo editado
  const [produtoEditado, setProdutoEditado] = useState({}); // Dados do produto em edição
  const [novo, setNovo] = useState({
    nome: '',
    categoria: '',
    quantidade: 0,
    quantidadeMinima: 1,
    unidade: 'unidade',
    preco: 0,
    valorCompra: 0,
    valorVenda: 0,
    comissao: 0,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/produtos`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProdutos(data.data || []);
        } else {
          setError(data.message || 'Erro ao carregar produtos');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Erro ao carregar produtos');
        setLoading(false);
      });
  }, []);

  const salvarProduto = async () => {
    if (!novo.nome || !novo.categoria) {
      setError('Nome e categoria são obrigatórios');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/produtos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nome: novo.nome,
          categoria: novo.categoria,
          quantidade: novo.quantidade,
          quantidadeMinima: novo.quantidadeMinima,
          unidade: novo.unidade,
          preco: novo.preco,
          valorCompra: novo.valorCompra,
          valorVenda: novo.valorVenda,
          comissao: novo.comissao,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProdutos([...produtos, data.data]);
        setNovo({
          nome: '',
          categoria: '',
          quantidade: 0,
          quantidadeMinima: 1,
          unidade: 'unidade',
          preco: 0,
          valorCompra: 0,
          valorVenda: 0,
          comissao: 0,
        });
        setError('');
      } else {
        setError(data.message || 'Erro ao salvar produto');
      }
    } catch (err) {
      setError('Erro ao salvar produto');
    }
  };

  const movimentar = async (id, tipo) => {
    const quantidade = parseInt(prompt(`Quantidade para ${tipo}`));
    if (!quantidade || quantidade <= 0) return;

    const motivo = prompt('Motivo da movimentação');
    if (!motivo) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/produtos/${id}/movimentar`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tipo,
          quantidade,
          motivo,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Recarregar a lista de produtos
        const produtosRes = await fetch(`${API_BASE_URL}/api/produtos`, {
          headers: getAuthHeaders(),
        });
        const produtosData = await produtosRes.json();
        if (produtosData.success) {
          setProdutos(produtosData.data || []);
        }
      } else {
        setError(data.message || 'Erro na movimentação');
      }
    } catch (err) {
      setError('Erro na movimentação');
    }
  };

  const iniciarEdicao = (produto) => {
    setEditando(produto._id);
    setProdutoEditado({
      nome: produto.nome,
      categoria: produto.categoria,
      quantidadeMinima: produto.quantidadeMinima,
      unidade: produto.unidade,
      preco: produto.preco || 0,
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setProdutoEditado({});
  };

  const salvarEdicao = async () => {
    if (!produtoEditado.nome || !produtoEditado.categoria) {
      setError('Nome e categoria são obrigatórios');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/produtos/${editando}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(produtoEditado),
      });

      const data = await res.json();

      if (data.success) {
        // Recarregar a lista de produtos
        const produtosRes = await fetch(`${API_BASE_URL}/api/produtos`, {
          headers: getAuthHeaders(),
        });
        const produtosData = await produtosRes.json();
        if (produtosData.success) {
          setProdutos(produtosData.data || []);
        }
        setEditando(null);
        setProdutoEditado({});
        setError('');
      } else {
        setError(data.message || 'Erro ao salvar produto');
      }
    } catch (err) {
      setError('Erro ao salvar produto');
    }
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
        <h1 className="text-2xl font-bold mb-4">Estoque</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4 md:mb-6 bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Adicionar Produto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Produto *
              </label>
              <input
                placeholder="Ex: Shampoo Anticaspa"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <input
                placeholder="Ex: Higiene, Corte, Barba"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.categoria}
                onChange={(e) =>
                  setNovo({ ...novo, categoria: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade Inicial
              </label>
              <input
                type="number"
                placeholder="0"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.quantidade}
                onChange={(e) =>
                  setNovo({ ...novo, quantidade: +e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade Mínima
              </label>
              <input
                type="number"
                placeholder="1"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.quantidadeMinima}
                onChange={(e) =>
                  setNovo({ ...novo, quantidadeMinima: +e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade de Medida
              </label>
              <select
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.unidade}
                onChange={(e) => setNovo({ ...novo, unidade: e.target.value })}
              >
                <option value="unidade">Unidade</option>
                <option value="unid">Unid</option>
                <option value="ml">ML</option>
                <option value="l">Litro</option>
                <option value="g">Grama</option>
                <option value="kg">Quilograma</option>
                <option value="caixa">Caixa</option>
                <option value="pacote">Pacote</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Compra (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.valorCompra}
                onChange={(e) => setNovo({ ...novo, valorCompra: +e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.valorVenda}
                onChange={(e) => setNovo({ ...novo, valorVenda: +e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comissão (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0,0"
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={novo.comissao}
                onChange={(e) => setNovo({ ...novo, comissao: +e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-start">
            <button
              onClick={salvarProduto}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              ✅ Salvar Produto
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Categoria
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qtd
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Qtd Mín
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Unidade
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Val. Compra
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Val. Venda
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Comissão
                </th>
                <th className="px-2 md:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-2 md:px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produtos.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-2 md:px-4 lg:px-6 py-4 text-center text-gray-500"
                  >
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtos.map((produto) => (
                  <tr
                    key={produto._id}
                    className={
                      produto.emFalta
                        ? 'bg-red-50'
                        : produto.statusEstoque === 'baixo'
                        ? 'bg-yellow-50'
                        : ''
                    }
                  >
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editando === produto._id ? (
                        <input
                          type="text"
                          value={produtoEditado.nome}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              nome: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        produto.nome
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {editando === produto._id ? (
                        <input
                          type="text"
                          value={produtoEditado.categoria}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              categoria: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        produto.categoria
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produto.quantidade}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {editando === produto._id ? (
                        <input
                          type="number"
                          value={produtoEditado.quantidadeMinima}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              quantidadeMinima: +e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        produto.quantidadeMinima
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {editando === produto._id ? (
                        <select
                          value={produtoEditado.unidade}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              unidade: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="unidade">unidade</option>
                          <option value="unid">unid</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="caixa">caixa</option>
                          <option value="pacote">pacote</option>
                        </select>
                      ) : (
                        produto.unidade
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                      {editando === produto._id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={produtoEditado.preco}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              preco: +e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        `R$ ${(produto.preco || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                      {editando === produto._id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={produtoEditado.valorCompra || 0}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              valorCompra: +e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        `R$ ${(produto.valorCompra || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                      {editando === produto._id ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={produtoEditado.comissao || 0}
                          onChange={(e) =>
                            setProdutoEditado({
                              ...produtoEditado,
                              comissao: +e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        `${(produto.comissao || 0).toFixed(1)}%`
                      )}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          produto.emFalta
                            ? 'bg-red-100 text-red-800'
                            : produto.statusEstoque === 'baixo'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {produto.emFalta
                          ? 'Falta'
                          : produto.statusEstoque === 'baixo'
                          ? 'Baixo'
                          : 'OK'}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                      {editando === produto._id ? (
                        <>
                          <button
                            onClick={salvarEdicao}
                            className="bg-green-600 text-white px-2 lg:px-3 py-1 rounded hover:bg-green-700 transition-colors text-xs lg:text-sm"
                          >
                            ✅ Salvar
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            className="bg-gray-600 text-white px-2 lg:px-3 py-1 rounded hover:bg-gray-700 transition-colors text-xs lg:text-sm"
                          >
                            ❌ Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicao(produto)}
                            className="bg-purple-600 text-white px-2 lg:px-3 py-1 rounded hover:bg-purple-700 transition-colors text-xs lg:text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => movimentar(produto._id, 'entrada')}
                            className="bg-green-600 text-white px-2 lg:px-3 py-1 rounded hover:bg-green-700 transition-colors text-xs lg:text-sm"
                          >
                            +
                          </button>
                          <button
                            onClick={() => movimentar(produto._id, 'saida')}
                            className="bg-red-600 text-white px-2 lg:px-3 py-1 rounded hover:bg-red-700 transition-colors text-xs lg:text-sm"
                          >
                            -
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}