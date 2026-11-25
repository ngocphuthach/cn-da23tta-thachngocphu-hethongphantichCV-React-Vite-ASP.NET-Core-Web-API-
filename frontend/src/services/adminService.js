import { adminApiRequest } from './adminApiClient'

const root = '/api/admin/catalog'

export const adminService = {
  stats: (token) => adminApiRequest('/api/admin/stats', { token }),
  cvs: (token, page = 1, sourceType = '', pageSize = 20) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (sourceType) query.set('sourceType', sourceType)
    return adminApiRequest(`/api/admin/cvs?${query}`, { token })
  },
  users: (token, page, email) => {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (email) query.set('email', email)
    return adminApiRequest(`/api/admin/users?${query}`, { token })
  },
  setUserStatus: (token, userId, body) => adminApiRequest(`/api/admin/users/${userId}/status`, { token, method: 'PUT', body }),
  analyses: (token, page, status, cvId = '', pageSize = 20) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) query.set('status', status)
    if (cvId) query.set('cvId', cvId)
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
  employers: (token) => adminApiRequest('/api/admin/employers', { token }),
  createEmployer: (token, body) => adminApiRequest('/api/admin/employers', { token, method: 'POST', body }),
  updateEmployer: (token, id, body) => adminApiRequest(`/api/admin/employers/${id}`, { token, method: 'PUT', body }),
  employerPostings: (token) => adminApiRequest('/api/admin/employers/postings', { token }),
  createEmployerPosting: (token, body) => adminApiRequest('/api/admin/employers/postings', { token, method: 'POST', body }),
  updateEmployerPosting: (token, id, body) => adminApiRequest(`/api/admin/employers/postings/${id}`, { token, method: 'PUT', body }),
}
