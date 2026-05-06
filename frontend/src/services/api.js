const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Token legado: mantido apenas para compatibilidade durante a migração.
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Headers padrão
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Método genérico para fazer requisições
  async request(endpoint, options = {}) {
    // Limpar barras duplicadas
    const cleanBaseURL = this.baseURL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanBaseURL}/${cleanEndpoint}`;
    const config = {
      credentials: 'include',
      ...options,
      headers: {
        ...this.getHeaders(options.auth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos HTTP
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  }

  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Auth endpoints
  async login(credentials) {
    const response = await this.post('/api/auth/login', credentials, {
      auth: false,
    });
    if (response.success && response.data?.user) {
      localStorage.removeItem('token');
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async verifyToken() {
    return this.post('/api/auth/verify');
  }

  // Agendamentos
  async getAgendamentos(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/agendamentos?${searchParams}`);
  }

  async getAgendamento(id) {
    return this.get(`/api/agendamentos/${id}`);
  }

  async createAgendamento(data) {
    return this.post('/api/agendamentos', data);
  }

  async updateAgendamento(id, data) {
    return this.put(`/api/agendamentos/${id}`, data);
  }

  async cancelarAgendamento(id, motivo) {
    return this.patch(`/api/agendamentos/${id}/cancelar`, { motivo });
  }

  async confirmarAgendamento(id) {
    return this.patch(`/api/agendamentos/${id}/confirmar`);
  }

  async concluirAgendamento(id, data) {
    return this.patch(`/api/agendamentos/${id}/concluir`, data);
  }

  async getHorariosDisponiveis(params) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/agendamentos/horarios-disponiveis?${searchParams}`);
  }

  async getEstatisticasAgendamentos(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/agendamentos/estatisticas?${searchParams}`);
  }

  // Serviços
  async getServicos(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/servicos?${searchParams}`);
  }

  async getServico(id) {
    return this.get(`/api/servicos/${id}`);
  }

  async createServico(data) {
    return this.post('/api/servicos', data);
  }

  async updateServico(id, data) {
    return this.put(`/api/servicos/${id}`, data);
  }

  async deleteServico(id) {
    return this.delete(`/api/servicos/${id}`);
  }

  // Caixa
  async getCaixa(data) {
    return this.get(`/api/caixa?data=${data}`);
  }

  async addMovimentacaoCaixa(data) {
    return this.post('/api/caixa', data);
  }

  async getRelatorioFinanceiro(params) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/caixa/relatorio?${searchParams}`);
  }

  async getComparativoFinanceiro() {
    return this.get('/api/caixa/comparativo');
  }

  async getReceitaPorTipo() {
    return this.get('/api/caixa/receita-por-tipo');
  }

  async exportarCaixa(params) {
    const searchParams = new URLSearchParams(params);
    const url = `${this.baseURL}/api/caixa/export?${searchParams}`;

    // Para download de arquivo
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_caixa.xlsx';
    link.click();
  }

  // Produtos
  async getProdutos() {
    return this.get('/api/produtos');
  }

  async createProduto(data) {
    return this.post('/api/produtos', data);
  }

  async updateProduto(id, data) {
    return this.put(`/api/produtos/${id}`, data);
  }

  async movimentarProduto(id, data) {
    return this.patch(`/api/produtos/${id}/movimentar`, data);
  }

  // Users
  async getUsuarios() {
    return this.get('/api/users');
  }

  async createUsuario(data) {
    return this.post('/api/users', data);
  }

  async updateUsuario(id, data) {
    return this.put(`/api/users/${id}`, data);
  }

  // Dashboard
  async getDashboardData(mes = null, ano = null) {
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (ano) params.append('ano', ano);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/dashboard?${queryString}`
      : '/api/dashboard';

    return this.get(endpoint);
  }

  // Clientes
  async getClientes(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/api/clientes?${searchParams}`);
  }

  async getCliente(id) {
    return this.get(`/api/clientes/${id}`);
  }

  async createCliente(data) {
    return this.post('/api/clientes', data);
  }

  async updateCliente(id, data) {
    return this.put(`/api/clientes/${id}`, data);
  }

  async deleteCliente(id) {
    return this.delete(`/api/clientes/${id}`);
  }
}

// Exports para compatibilidade com código antigo
export const getAuthHeaders = () => {
  const apiServiceInstance = new ApiService();
  return apiServiceInstance.getHeaders();
};

export { API_BASE_URL };

const apiService = new ApiService();
export default apiService;
