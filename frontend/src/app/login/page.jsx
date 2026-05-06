'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/services/api';
import { API_BASE_URL } from '@/services/api';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      try {
        await apiService.verifyToken();
        router.push('/dashboard');
      } catch {
        localStorage.removeItem('user');
      }
    }

    checkSession();
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiService.login({ usuario, senha });

      if (data.success) {
        // Verificar se é senha padrão (123456)
        if (senha === '123456') {
          setShowChangePassword(true);
          setError('');
        } else {
          localStorage.setItem('user', JSON.stringify(data.data.user));

          // Redirecionar baseado no role do usuário
          if (data.data.user.role === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/agenda');
          }
        }
      } else {
        setError(data.message || 'Erro ao fazer login');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      // Mostrar erro mais detalhado em desenvolvimento
      const errorMessage =
        process.env.NODE_ENV === 'development'
          ? `Erro: ${err.message}`
          : 'Erro de conexão. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          novaSenha: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setShowChangePassword(false);
        router.push('/dashboard');
      } else {
        setError(data.message || 'Erro ao alterar senha');
      }
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo-monarca.png"
                alt="Logo Barbearia Monarca"
                width={128}
                height={128}
                className="h-32 w-32 object-contain"
              />
            </div>
            <p className="text-gray-600">Faça login para acessar o sistema</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="usuario"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Usuário
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-900 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6">
        <div className="text-center text-sm text-gray-600">
          Todos os direitos reservados - 2026 - Desenvolvido por eBarber
        </div>
      </footer>

      {/* Modal de Troca de Senha */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🔐 Alterar Senha</h2>
              <p className="text-gray-600">
                Por segurança, você deve alterar sua senha padrão antes de continuar.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  minLength="6"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  minLength="6"
                  disabled={loading}
                />
              </div>

              <div className="text-xs text-gray-500 mb-4">
                • Mínimo 6 caracteres<br/>
                • Use uma senha segura e única
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-900 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                disabled={loading}
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
