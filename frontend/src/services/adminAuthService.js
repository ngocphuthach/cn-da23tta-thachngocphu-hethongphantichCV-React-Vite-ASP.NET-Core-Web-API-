import { adminApiRequest } from './adminApiClient'

export const adminAuthService = {
  login: (body) => adminApiRequest('/api/admin/auth/login', { method: 'POST', body }),
  me: (token) => adminApiRequest('/api/admin/auth/me', { token }),
}
