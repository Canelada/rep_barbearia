const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const cleanBaseURL = this.baseURL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanBaseURL}/${cleanEndpoint}`;
    const config = {
      credentials: 'include',
      ...options,
      headers: {
        ...this.getHeaders(),
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

  async login(credentials) {
    const response = await this.post('/api/auth/login', credentials);
    if (response.success && response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('user');
    }
  }

  async verifyToken() {
    return this.post('/api/auth/verify');
  }

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
}

export const getAuthHeaders = () => {
  const apiServiceInstance = new ApiService();
  return apiServiceInstance.getHeaders();
};

export { API_BASE_URL };

const apiService = new ApiService();
export default apiService;
