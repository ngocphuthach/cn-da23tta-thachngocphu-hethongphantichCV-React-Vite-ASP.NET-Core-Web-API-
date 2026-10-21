import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { BrandMark } from './BrandMark'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = () => { signOut(); navigate('/login', { replace: true }) }
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Career Compass, về trang chủ"><BrandMark /><span className="brand-word">Career Compass</span></NavLink>
        <nav aria-label="Điều hướng chính">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/cvs">CV của tôi</NavLink>
          <NavLink to="/history">Lịch sử</NavLink>
        </nav>
        <div className="account"><span>{user?.fullName || 'Tài khoản'}</span><button className="button button-quiet" onClick={logout}>Đăng xuất</button></div>
      </header>
      <main key={location.pathname} className="page-content route-enter"><Outlet /></main>
      <footer className="footer"><strong>Career Compass</strong><span>·</span> Kết quả mang tính tham khảo</footer>
    </div>
  )
}
