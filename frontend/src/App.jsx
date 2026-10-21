import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
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

function App() {
  usePageVisibility()

  return (
    <AuthProvider>
      <Suspense fallback={<PageSkeleton title="Đang mở trang" />}>
        <Routes>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
