import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { authService } from '../services/authService'
import { getFriendlyError } from '../services/apiClient'
import { BrandMark } from './BrandMark'

export function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { acceptLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.password.length < 8 || form.password.length > 128) {
      setError('Mật khẩu phải có từ 8 đến 128 ký tự.')
      return
    }
    setBusy(true)
    try {
      if (isRegister) {
        await authService.register(form)
        navigate('/login', { replace: true, state: { notice: 'Đăng ký thành công. Hãy đăng nhập để tiếp tục.' } })
      } else {
        const result = await authService.login({ email: form.email, password: form.password })
        acceptLogin(result)
        navigate(location.state?.from?.pathname || '/cvs', { replace: true })
      }
    } catch (requestError) {
      setError(getFriendlyError(requestError, 'auth'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-story">
          <Link className="brand" to="/" aria-label="Career Compass, về trang chủ"><BrandMark /><span className="brand-word">Career Compass</span></Link>
          <div><p className="eyebrow">HỒ SƠ VÀ ĐỊNH HƯỚNG NGHỀ NGHIỆP</p><h2>Hồ sơ rõ ràng, lựa chọn có thêm góc nhìn.</h2><p>Khu vực tài khoản giúp bạn quản lý CV và xem lại lịch sử phân tích.</p></div>
          <div className="auth-art" aria-hidden="true"><svg viewBox="0 0 360 210" fill="none"><path d="M25 177 111 111l62 33 76-97 83 70" stroke="#2B50F5" strokeWidth="3" strokeDasharray="7 8"/><circle cx="111" cy="111" r="15" fill="#fff" stroke="#2B50F5" strokeWidth="3"/><circle cx="249" cy="47" r="18" fill="#E4EAFF" stroke="#2B50F5" strokeWidth="3"/><path d="m247 39-5 12 13-6-8-6Z" fill="#FFB020"/><rect x="23" y="143" width="68" height="48" rx="9" fill="#fff" stroke="#D9E0EE" strokeWidth="2"/><path d="M37 157h39M37 169h28M37 180h33" stroke="#2B50F5" strokeWidth="3" strokeLinecap="round"/></svg></div>
        </aside>
        <div className="auth-form-side">
          <p className="eyebrow">CAREER COMPASS</p>
          <h1>{isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h1>
          <p className="muted">{isRegister ? 'Bắt đầu quản lý CV và định hướng nghề nghiệp.' : 'Đăng nhập để tiếp tục với hồ sơ của bạn.'}</p>
          {location.state?.notice && <div className="notice success">{location.state.notice}</div>}
          {error && <div className="notice error" role="alert">{error}</div>}
          <form onSubmit={submit} className="form-stack">
            {isRegister && <label>Họ và tên<input name="fullName" autoComplete="name" required maxLength="150" value={form.fullName} onChange={update} /></label>}
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength="256" value={form.email} onChange={update} /></label>
            <label>Mật khẩu<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength="8" maxLength="128" value={form.password} onChange={update} /></label>
            <button className="button button-primary full-width" disabled={busy}>{busy ? 'Đang xử lý…' : isRegister ? 'Đăng ký' : 'Đăng nhập'}</button>
          </form>
          <p className="auth-switch">{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Đăng nhập' : 'Đăng ký'}</Link></p>
          <p className="auth-switch"><Link to="/">← Về trang chủ</Link></p>
        </div>
      </section>
    </main>
  )
}
