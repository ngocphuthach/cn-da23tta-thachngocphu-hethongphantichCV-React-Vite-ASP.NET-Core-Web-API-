import { ApiError } from './apiClient'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
let unauthorizedHandler = () => {}

export function setAdminUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export async function adminApiRequest(path, { token, body, method = 'GET', headers = {}, signal } = {}) {
  if (!path.startsWith('/api/admin/')) throw new Error('Admin API client only accepts /api/admin routes.')

  const requestHeaders = new Headers(headers)
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  if (body && !(body instanceof FormData)) requestHeaders.set('Content-Type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler()
    let payload = null
    try { payload = await response.json() } catch { /* The response body can be empty. */ }
    throw new ApiError(response.status, payload?.message || payload?.title || '', payload)
  }
  if (response.status === 204) return null
  return response.json()
}
