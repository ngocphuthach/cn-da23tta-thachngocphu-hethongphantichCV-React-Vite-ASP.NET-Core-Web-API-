import { apiRequest } from './apiClient'

export const cvService = {
  listCvs: (token) => apiRequest('/api/cvs', { token }),
  upload: (token, file) => {
    const body = new FormData()
    body.append('file', file)
    return apiRequest('/api/cvs', { token, method: 'POST', body })
  },
  createManual: (token, data) => apiRequest('/api/cvs/manual', { token, method: 'POST', body: data }),
  getManualContent: (token, cvId) => apiRequest(`/api/cvs/${cvId}/content`, { token }),
  deleteCv: (token, cvId) => apiRequest(`/api/cvs/${cvId}`, { token, method: 'DELETE' }),
  listCvAnalyses: (token, cvId) => apiRequest(`/api/cvs/${cvId}/analyses`, { token }),
  analyze: (token, cvId, signal) => apiRequest(`/api/cvs/${cvId}/analyses`, { token, method: 'POST', signal }),
  listAnalyses: (token, page, pageSize) => apiRequest(`/api/cv-analyses?page=${page}&pageSize=${pageSize}`, { token }),
  getAnalysis: (token, analysisId) => apiRequest(`/api/cv-analyses/${analysisId}`, { token }),
}
