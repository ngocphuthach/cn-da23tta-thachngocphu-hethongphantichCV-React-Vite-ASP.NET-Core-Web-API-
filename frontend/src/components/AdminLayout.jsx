import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/useAdminAuth'
import { AdminSectionNav } from './AdminSectionNav'
import { BrandMark } from './BrandMark'
import './Admin.css'

export function AdminLayout() {
  const { admin, signOut } = useAdminAuth()
  const navigate = useNavigate()

  function logout() {
    signOut()
    navigate('/admin/login', { replace: true })
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/" aria-label="Career Compass, về trang chủ">
        <BrandMark /><span>Career Compass</span>
      </Link>
      <p className="admin-area-label">Khu vực quản trị</p>
      <AdminSectionNav />
      <Link className="admin-home-link" to="/">← Về trang chủ</Link>
    </aside>
    <div className="admin-main-column">
      <header className="admin-topbar">
        <span className="admin-email">{admin?.email}</span>
        <button className="button button-quiet" onClick={logout}>Đăng xuất</button>
      </header>
      <main className="admin-main-content"><Outlet /></main>
    </div>
  </div>
}
