import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { BrandMark } from './BrandMark'
import { CompassIcon, FileTextIcon, ClockIcon, BriefcaseIcon, UserIcon } from './Icons'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const recruiterTabActive = location.pathname === '/cvs' && new URLSearchParams(location.search).get('tab') === 'recruiter'
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
          <NavLink to="/cvs" className={({ isActive }) => isActive && !recruiterTabActive ? 'active' : undefined}>
            <FileTextIcon size={19} />
            <span>Phân tích CV</span>
          </NavLink>
          <Link to="/cvs?tab=recruiter" className={recruiterTabActive ? 'active' : undefined} aria-current={recruiterTabActive ? 'page' : undefined}>
            <BriefcaseIcon size={19} />
            <span>Yêu cầu tuyển dụng</span>
          </Link>
          <NavLink to="/history">
            <ClockIcon size={19} />
            <span>Lịch sử</span>
          </NavLink>
          <NavLink to="/profile">
            <UserIcon size={19} />
            <span>Hồ sơ cá nhân</span>
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
          <div className="app-footer-brand"><BrandMark /><strong>Career Compass</strong><span>·</span><b>La bàn kỹ năng cho hành trình nghề nghiệp CNTT</b></div>
          <p>Nhìn rõ kỹ năng hiện có, khám phá hướng đi phù hợp và lưu lại từng bước hoàn thiện CV.</p>
          <small>Kết quả là mức khớp kỹ năng do hệ thống tính, chỉ mang tính tham khảo.</small>
        </footer>
      </div>
    </div>
  )
}
