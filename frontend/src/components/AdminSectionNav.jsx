import { Link, NavLink, useLocation } from 'react-router-dom'
import { BriefcaseIcon, ClockIcon, FileTextIcon, ShieldCheckIcon, TrendingUpIcon, UserIcon } from './Icons'

export function AdminSectionNav() {
  const location = useLocation()
  const links = [
    { to: '/admin', label: 'Dashboard', icon: TrendingUpIcon, end: true },
    { to: '/admin/cvs', label: 'Quản lý CV', icon: FileTextIcon },
    { to: '/admin/employers', label: 'Nhà tuyển dụng', icon: BriefcaseIcon },
    { to: '/admin/users', label: 'Người dùng', icon: UserIcon },
    { to: '/admin/catalog?tab=jobs', label: 'Vị trí nghề', icon: BriefcaseIcon },
    { to: '/admin/catalog?tab=skills', label: 'Kỹ năng', icon: ShieldCheckIcon },
    { to: '/admin#statistics', label: 'Thống kê', icon: TrendingUpIcon },
    { to: '/admin/analyses', label: 'Phân tích', icon: ShieldCheckIcon },
    { to: '/admin/audit', label: 'Nhật ký', icon: ClockIcon },
  ]
  return <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
    {links.map(({ to, label, icon: Icon, end }) => {
      const content = <><Icon size={18} /><span>{label}</span></>
      if (to.includes('?tab=')) {
        const currentTab = new URLSearchParams(location.search).get('tab') || 'jobs'
        const active = location.pathname === '/admin/catalog'
          && currentTab === new URLSearchParams(to.split('?')[1]).get('tab')
        return <Link className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined} key={to} to={to}>{content}</Link>
      }
      return <NavLink end={end} key={to} to={to}>{content}</NavLink>
    })}
  </nav>
}
