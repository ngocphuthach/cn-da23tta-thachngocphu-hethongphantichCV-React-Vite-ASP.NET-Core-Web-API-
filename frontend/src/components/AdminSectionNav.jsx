import { NavLink } from 'react-router-dom'

export function AdminSectionNav() {
  return <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
    <NavLink end to="/admin">Dashboard</NavLink>
    <NavLink to="/admin/catalog">Danh mục</NavLink>
    <NavLink to="/admin/users">Người dùng</NavLink>
    <NavLink to="/admin/analyses">Phân tích</NavLink>
    <NavLink to="/admin/audit">Nhật ký</NavLink>
  </nav>
}
