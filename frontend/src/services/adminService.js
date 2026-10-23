import { adminApiRequest } from './adminApiClient'

const root = '/api/admin/catalog'

export const adminService = {
  stats: (token) => adminApiRequest('/api/admin/stats', { token }),
  users: (token, page, email) => {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (email) query.set('email', email)
    return adminApiRequest(`/api/admin/users?${query}`, { token })
  },
  setUserStatus: (token, userId, body) => adminApiRequest(`/api/admin/users/${userId}/status`, { token, method: 'PUT', body }),
  analyses: (token, page, status) => {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (status) query.set('status', status)
    return adminApiRequest(`/api/admin/analyses?${query}`, { token })
  },
  jobs: (token) => adminApiRequest(`${root}/job-positions?includeInactive=true`, { token }),
  createJob: (token, body) => adminApiRequest(`${root}/job-positions`, { token, method: 'POST', body }),
  updateJob: (token, id, body) => adminApiRequest(`${root}/job-positions/${id}`, { token, method: 'PUT', body }),
  skills: (token) => adminApiRequest(`${root}/skills?includeInactive=true`, { token }),
  createSkill: (token, body) => adminApiRequest(`${root}/skills`, { token, method: 'POST', body }),
  updateSkill: (token, id, body) => adminApiRequest(`${root}/skills/${id}`, { token, method: 'PUT', body }),
  updateLink: (token, jobId, skillId, body) => adminApiRequest(`${root}/job-positions/${jobId}/skills/${skillId}`, { token, method: 'PUT', body }),
  removeLink: (token, jobId, skillId, rowVersion) => adminApiRequest(`${root}/job-positions/${jobId}/skills/${skillId}?rowVersion=${encodeURIComponent(rowVersion)}`, { token, method: 'DELETE' }),
  audit: (token, page) => adminApiRequest(`${root}/audit?page=${page}&pageSize=20`, { token }),
}
