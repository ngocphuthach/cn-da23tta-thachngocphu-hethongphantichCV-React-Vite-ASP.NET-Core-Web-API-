import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { AdminLayout } from './components/AdminLayout'
import { AppLayout } from './components/AppLayout'
import { PageSkeleton } from './components/PageSkeleton'
import { usePageVisibility } from './hooks/usePageVisibility'
import './App.css'
import './motion.css'
import './brand.css'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const MyCvsPage = lazy(() => import('./pages/MyCvsPage').then((module) => ({ default: module.MyCvsPage })))
const AnalysisHistoryPage = lazy(() => import('./pages/AnalysisHistoryPage').then((module) => ({ default: module.AnalysisHistoryPage })))
const AnalysisResultPage = lazy(() => import('./pages/AnalysisResultPage').then((module) => ({ default: module.AnalysisResultPage })))
const AdminCatalogPage = lazy(() => import('./pages/AdminCatalogPage').then((module) => ({ default: module.AdminCatalogPage })))
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminAnalysesPage = lazy(() => import('./pages/AdminAnalysesPage').then((module) => ({ default: module.AdminAnalysesPage })))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })))

function App() {
  usePageVisibility()

  return (
    <Suspense fallback={<PageSkeleton title="Đang mở trang" />}>
      <Routes>
        <Route element={<AuthProvider><Outlet /></AuthProvider>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/cvs" element={<MyCvsPage />} />
              <Route path="/history" element={<AnalysisHistoryPage />} />
              <Route path="/analyses/:analysisId" element={<AnalysisResultPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<AdminAuthProvider><Outlet /></AdminAuthProvider>}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="catalog" element={<AdminCatalogPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="analyses" element={<AdminAnalysesPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
