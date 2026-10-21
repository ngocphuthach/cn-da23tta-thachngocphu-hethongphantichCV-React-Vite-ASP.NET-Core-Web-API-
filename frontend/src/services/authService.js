import { apiRequest } from './apiClient'

export const authService = {
  register: (data) => apiRequest('/api/auth/register', { method: 'POST', body: data }),
  login: (data) => apiRequest('/api/auth/login', { method: 'POST', body: data }),
  me: (token) => apiRequest('/api/auth/me', { token }),
}
