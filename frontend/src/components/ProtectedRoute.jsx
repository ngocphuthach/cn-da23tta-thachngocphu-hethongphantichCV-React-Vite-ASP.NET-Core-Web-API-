import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute() {
  const { token, checking } = useAuth()
  const location = useLocation()
  if (checking) return <main className="center-state">Đang kiểm tra phiên đăng nhập…</main>
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
