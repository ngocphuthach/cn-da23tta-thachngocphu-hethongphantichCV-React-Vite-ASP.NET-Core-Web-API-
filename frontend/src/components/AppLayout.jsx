import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { BrandMark } from './BrandMark'
import { CompassIcon, FileTextIcon, ClockIcon } from './Icons'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = () => { signOut(); navigate('/login', { replace: true }) }

  return (
    <div className="app-shell app-shell-sidebar">
      <aside className="app-sidebar">
        <NavLink className="app-brand" to="/" aria-label="Career Compass, về trang chủ">
          <BrandMark />
          <span>Career Compass</span>
        </NavLink>
        <nav className="app-sidebar-nav" aria-label="Điều hướng chính">
          <NavLink end to="/">
            <CompassIcon size={19} />
            <span>Trang chủ</span>
          </NavLink>
          <NavLink to="/cvs">
            <FileTextIcon size={19} />
            <span>Phân tích CV</span>
          </NavLink>
          <NavLink to="/history">
            <ClockIcon size={19} />
            <span>Lịch sử</span>
          </NavLink>
        </nav>
        <div className="app-account-panel">
          <span className="app-account-avatar" aria-hidden="true">
            {user?.fullName?.trim()?.charAt(0)?.toLocaleUpperCase('vi-VN') || 'U'}
          </span>
          <span className="app-account-copy">
            <strong>{user?.fullName || 'Tài khoản'}</strong>
            <small>Tài khoản cá nhân</small>
          </span>
          <button className="button button-quiet" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <div className="app-main-column">
        <header className="app-content-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Ứng dụng</span>
            <span style={{ color: 'var(--line)' }}>/</span>
            <span style={{ fontWeight: 700 }}>Career Compass Workspace</span>
          </div>
          <span className="app-topbar-user">Xin chào, {user?.fullName || 'bạn'}</span>
        </header>
        <main key={location.pathname} className="page-content app-page-content route-enter">
          <Outlet />
        </main>
        <footer className="footer app-footer">
          <strong>Career Compass</strong><span>·</span> Kết quả phân tích mang tính chất tham khảo định hướng
        </footer>
      </div>
    </div>
  )
}
