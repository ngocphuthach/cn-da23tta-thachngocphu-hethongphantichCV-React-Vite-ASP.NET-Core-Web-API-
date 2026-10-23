import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/useAdminAuth'
import { PageSkeleton } from './PageSkeleton'

export function AdminRoute() {
  const { token, admin, checking } = useAdminAuth()
  if (checking || (token && !admin)) return <PageSkeleton title="Đang kiểm tra quyền quản trị" />
  if (!token || !admin || admin.role !== 'Admin') return <Navigate to="/admin/login" replace />
  return <Outlet />
}
