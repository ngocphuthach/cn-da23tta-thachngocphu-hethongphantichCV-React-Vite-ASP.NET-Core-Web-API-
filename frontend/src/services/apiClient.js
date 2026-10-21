const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, payload = null) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

let unauthorizedHandler = () => {}
export function setUnauthorizedHandler(handler) { unauthorizedHandler = handler }

export async function apiRequest(path, { token, body, signal, method = 'GET', headers = {} } = {}) {
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
    let message = ''
    let payload = null
    try {
      payload = await response.json()
      message = payload.message || payload.title || ''
    } catch { /* Response bodies can be empty. */ }
    throw new ApiError(response.status, message, payload)
  }
  if (response.status === 204) return null
  return response.json()
}

export function getFriendlyError(error, context = 'general') {
  if (error?.name === 'AbortError') return 'Yêu cầu đã được hủy.'
  if (!(error instanceof ApiError)) return 'Không thể kết nối máy chủ. Vui lòng thử lại sau.'
  if (context === 'auth' && (error.status === 401 || error.status === 429)) {
    return error.status === 429
      ? 'Bạn đã thử quá nhiều lần. Vui lòng chờ một chút rồi thử lại.'
      : 'Thông tin đăng nhập không hợp lệ.'
  }
  switch (error.status) {
    case 400: return 'Thông tin hoặc file chưa hợp lệ. Vui lòng kiểm tra và thử lại.'
    case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 404: return 'Không tìm thấy CV hoặc kết quả phân tích này.'
    case 409: return error.payload?.message?.includes('giới hạn 50 CV')
      ? 'Bạn đã đạt giới hạn 50 CV. Hãy xóa một CV trước khi thêm CV mới.'
      : 'CV đang được phân tích. Vui lòng chờ rồi thử lại.'
    case 429: return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ trước khi thử lại.'
    case 502: return 'Dịch vụ phân tích tạm thời không khả dụng. Vui lòng thử lại sau.'
    default: return 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
  }
}
