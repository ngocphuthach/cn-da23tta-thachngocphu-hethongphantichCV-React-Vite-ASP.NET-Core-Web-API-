import { apiRequest } from './apiClient'

export const authService = {
  register: (data) => apiRequest('/api/auth/register', { method: 'POST', body: data }),
  login: (data) => apiRequest('/api/auth/login', { method: 'POST', body: data }),
  me: (token) => apiRequest('/api/auth/me', { token }),
  updateProfile: (token, data) => apiRequest('/api/auth/profile', { token, method: 'PUT', body: data }),
  changePassword: (token, data) => apiRequest('/api/auth/change-password', { token, method: 'POST', body: data }),
}
