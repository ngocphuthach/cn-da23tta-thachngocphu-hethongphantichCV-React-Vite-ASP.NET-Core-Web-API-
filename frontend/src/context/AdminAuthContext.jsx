import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAuthService } from '../services/adminAuthService'
import { setAdminUnauthorizedHandler } from '../services/adminApiClient'
import { AdminAuthContext } from './adminAuthContextValue'

const ADMIN_TOKEN_KEY = 'careerCompassAdminAccessToken'

function readAdminToken() {
  try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) } catch { return null }
}

function writeAdminToken(token) {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch { /* Keep the session in memory when browser storage is unavailable. */ }
}

export function AdminAuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(readAdminToken)
  const [admin, setAdmin] = useState(null)
  const [checking, setChecking] = useState(Boolean(token))

  const signOut = useCallback(() => {
    writeAdminToken(null)
    setToken(null)
    setAdmin(null)
    setChecking(false)
  }, [])

  const acceptLogin = useCallback((response) => {
    writeAdminToken(response.accessToken)
    setToken(response.accessToken)
    setAdmin(response.user)
  }, [])

  useEffect(() => {
    setAdminUnauthorizedHandler(() => {
      signOut()
      navigate('/admin/login', { replace: true, state: { notice: 'Phiên quản trị đã hết hạn.' } })
    })
    return () => setAdminUnauthorizedHandler(() => {})
  }, [navigate, signOut])

  useEffect(() => {
    let active = true
    if (!token) {
      return () => { active = false }
    }
    adminAuthService.me(token)
      .then((profile) => { if (active) setAdmin(profile) })
      .catch(() => { if (active) signOut() })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [token, signOut])

  const value = useMemo(() => ({ token, admin, checking, acceptLogin, signOut }),
    [token, admin, checking, acceptLogin, signOut])
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
