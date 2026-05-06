'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatarMoeda } from '@/utils/formatters';
import apiService, { API_BASE_URL } from '@/services/api';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [comissaoTotal, setComissaoTotal] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const userData = localStorage.getItem('user');

    async function loadSession() {
      try {
        const verified = await apiService.verifyToken();
        const verifiedUser = verified.data.user;
        localStorage.setItem('user', JSON.stringify(verifiedUser));
        setUser(verifiedUser);

        if (verifiedUser.role !== 'admin' && verifiedUser.role !== 'manager') {
          buscarComissaoFuncionario(verifiedUser._id || verifiedUser.id);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadSession();
  }, [router, mounted]);

  const getHorarioHoje = (horarioTrabalho) => {
    const hoje = new Date();
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaHoje = diasSemana[hoje.getDay()];

    if (!horarioTrabalho || !horarioTrabalho[diaHoje]) {
      return 'Horário não definido';
    }

    const horarioHoje = horarioTrabalho[diaHoje];
    if (!horarioHoje.ativo) {
      return 'Folga hoje';
    }

    return `${horarioHoje.inicio} às ${horarioHoje.fim}`;
  };

  const buscarComissaoFuncionario = async (funcionarioId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/comissao/funcionario/${funcionarioId}?meses=12`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data && result.data.resumo) {
          setComissaoTotal(result.data.resumo.totalComissao);
          return;
        }
      }

      // Fallback para o método antigo se o novo endpoint falhar
      const agendamentosResponse = await fetch(`${API_BASE_URL}/api/agendamentos`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (agendamentosResponse.ok) {
        const agendamentos = await agendamentosResponse.json();
        const agendamentosArray = Array.isArray(agendamentos) ? agendamentos : agendamentos.data || [];

        const agendamentosConcluidos = agendamentosArray.filter(
          ag => {
            const agFuncionarioId = typeof ag.funcionarioId === 'object' ? ag.funcionarioId._id : ag.funcionarioId;
            return agFuncionarioId === funcionarioId && ag.status === 'concluido';
          }
        );

        const totalComissao = agendamentosConcluidos.reduce((total, agendamento) => {
          let comissaoAgendamento = 0;

          // Verificar se tem múltiplos serviços
          if (agendamento.servicos && agendamento.servicos.length > 0) {
            comissaoAgendamento = agendamento.servicos.reduce((subTotal, servico) => {
              const valorServico = servico.preco || 0;
              const comissaoServico = servico.comissao || 0;
              return subTotal + (valorServico * (comissaoServico / 100));
            }, 0);
          } else {
            // Formato antigo
            const valorServico = agendamento.preco || agendamento.valor || 0;
            const comissaoServico = agendamento.comissao || agendamento.servicoId?.comissao || 0;
            comissaoAgendamento = valorServico * (comissaoServico / 100);
          }

          return total + comissaoAgendamento;
        }, 0);

        setComissaoTotal(totalComissao);
      }
    } catch (error) {
      // Erro silencioso - comissão não é crítica
    }
  };

  const handleLogout = async () => {
    if (!mounted || isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await apiService.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    } catch (error) {
      // Erro silencioso no logout
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Logout ao fechar a página
  useEffect(() => {
    if (!mounted) return;

    const handleBeforeUnload = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [mounted]);

  // Logout por inatividade (10 minutos)
  useEffect(() => {
    if (!mounted) return;

    let timeoutId;
    const INACTIVITY_TIME = 10 * 60 * 1000; // 10 minutos em milissegundos

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_TIME);
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Adicionar listeners para todos os eventos
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar o timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-green-700 to-green-900 text-white shadow-lg fixed left-0 top-0 h-screen overflow-y-auto">
        {/* Logo centralizado no sidebar */}
        <div className="flex justify-center p-6 border-b border-green-600">
          <img
            src="/logo-monarca.png"
            alt="Logo Barbearia Monarca"
            className="h-40 w-40 rounded-lg shadow-lg object-contain"
          />
        </div>

        {/* Navegação */}
        <nav className="p-4">
          <ul className="space-y-2">
            {/* Dashboard - Admin e Gerência */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <li>
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>📊</span>
                  <span>Dashboard</span>
                </Link>
              </li>
            )}

            {/* Agendamentos - Todos têm acesso */}
            <li>
              <Link
                href="/agenda"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname.startsWith('/agenda')
                    ? 'bg-green-800 text-white shadow-md'
                    : 'text-green-100 hover:bg-green-800 hover:text-white'
                }`}
              >
                <span>📅</span>
                <span>Agendamentos</span>
              </Link>
            </li>

            {/* Clientes - Admin e Gerência */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <li>
                <Link
                  href="/clientes"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/clientes'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>👥</span>
                  <span>Clientes</span>
                </Link>
              </li>
            )}
            
            {/* Funcionários - Admin vê todos, funcionários veem apenas suas informações */}
            <li>
              <Link
                href="/funcionarios"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === '/funcionarios'
                    ? 'bg-green-800 text-white shadow-md'
                    : 'text-green-100 hover:bg-green-800 hover:text-white'
                }`}
              >
                <span>👨‍💼</span>
                <span>Funcionários</span>
              </Link>
            </li>
            
            {/* Serviços - Apenas Admin */}
            {user?.role === 'admin' && (
              <li>
                <Link
                  href="/servicos"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/servicos'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>✂️</span>
                  <span>Serviços</span>
                </Link>
              </li>
            )}
            
            {/* Caixa - Admin e Gerência */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <li>
                <Link
                  href="/caixa"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/caixa'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>💰</span>
                  <span>Caixa</span>
                </Link>
              </li>
            )}
            
            {/* Estoque - Apenas Admin */}
            {user?.role === 'admin' && (
              <li>
                <Link
                  href="/estoque"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/estoque'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>📦</span>
                  <span>Estoque</span>
                </Link>
              </li>
            )}
            
            {/* Relatórios - Apenas Admin */}
            {user?.role === 'admin' && (
              <li>
                <Link
                  href="/relatorios"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/relatorios'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>📋</span>
                  <span>Relatórios</span>
                </Link>
              </li>
            )}

            {/* Logs de Auditoria - Apenas Admin */}
            {user?.role === 'admin' && (
              <li>
                <Link
                  href="/logs"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/logs'
                      ? 'bg-green-800 text-white shadow-md'
                      : 'text-green-100 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <span>📜</span>
                  <span>Logs</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Header superior com informações do usuário */}
        <header className="bg-white shadow-md border-b border-gray-200">
          <div className="flex items-center justify-end px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="text-gray-700">
                <div>Olá, <strong>{user?.nome || 'Usuário'}</strong></div>
                <div className="text-sm space-x-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    user?.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user?.role === 'manager'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.role === 'admin' ? '👑 Administrador' : user?.role === 'manager' ? '🏢 Gerência' : '✂️ Barbeiro'}
                  </span>
                  {user?.role !== 'admin' && user?.role !== 'manager' && comissaoTotal > 0 && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      💰 Comissão: {formatarMoeda(comissaoTotal)}
                    </span>
                  )}
                  {user?.horarioTrabalho && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      🕐 {getHorarioHoje(user.horarioTrabalho)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 p-6">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="text-center text-sm text-gray-600">
            Todos os direitos reservados - 2026 - Desenvolvido por eBarber
          </div>
        </footer>
      </div>
    </div>
  );
}
