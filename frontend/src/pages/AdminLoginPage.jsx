import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import { adminAuthService } from '../services/adminAuthService'
import { useAdminAuth } from '../context/useAdminAuth'
import { BrandMark } from '../components/BrandMark'
import { PageSkeleton } from '../components/PageSkeleton'
import '../components/Admin.css'

export function AdminLoginPage() {
  const { token, admin, checking, acceptLogin } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (checking || (token && !admin)) return <PageSkeleton title="Đang kiểm tra phiên quản trị" />
  if (token && admin?.role === 'Admin') return <Navigate to="/admin" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await adminAuthService.login({ email, password })
      acceptLogin(response)
      navigate('/admin', { replace: true })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        setError('Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại.')
      } else {
        setError('Email hoặc mật khẩu không đúng.')
      }
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-login-page">
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <Link className="admin-login-brand" to="/" aria-label="Career Compass, về trang chủ">
        <BrandMark /><span>Career Compass</span>
      </Link>
      <p className="admin-login-eyebrow">Khu vực quản trị</p>
      <h1 id="admin-login-title">Đăng nhập Admin</h1>
      <p className="admin-login-description">Sử dụng tài khoản quản trị đã được cấp.</p>
      {location.state?.notice && <div className="notice info" role="status">{location.state.notice}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      <form className="form-stack" onSubmit={submit}>
        <label htmlFor="admin-email">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength="256"
          value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="admin-password">Mật khẩu</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength="128"
          value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button button-primary full-width" type="submit" disabled={busy}>
          {busy ? 'Đang xác thực…' : 'Đăng nhập'}
        </button>
      </form>
      <Link className="admin-login-home" to="/">← Về trang chủ</Link>
    </section>
  </main>
}
