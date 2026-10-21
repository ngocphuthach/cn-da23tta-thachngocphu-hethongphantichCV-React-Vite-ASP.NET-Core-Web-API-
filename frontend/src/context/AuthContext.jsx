import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { setUnauthorizedHandler } from '../services/apiClient'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => sessionStorage.getItem('accessToken'))
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(token))

  const signOut = useCallback(() => {
    sessionStorage.removeItem('accessToken')
    setToken(null)
    setUser(null)
    setChecking(false)
  }, [])

  const acceptLogin = useCallback((response) => {
    sessionStorage.setItem('accessToken', response.accessToken)
    setToken(response.accessToken)
    setUser(response.user)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut()
      navigate('/login', { replace: true, state: { notice: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' } })
    })
    return () => setUnauthorizedHandler(() => {})
  }, [navigate, signOut])

  useEffect(() => {
    let active = true
    if (!token) {
      return () => { active = false }
    }
    authService.me(token)
      .then((profile) => { if (active) setUser(profile) })
      .catch(() => { if (active) signOut() })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [token, signOut])

  const value = useMemo(() => ({ token, user, checking, acceptLogin, signOut }), [token, user, checking, acceptLogin, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
