import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '@/api/auth.js'
import { clearAuthState, readAuthState, writeAuthState } from '@/api/client.js'
import { AuthContext } from './authContext.js'

function initials(username) {
  return (username || 'AD').slice(0, 2).toUpperCase()
}

function decorateUser(user) {
  if (!user) return null
  return {
    ...user,
    initials: initials(user.username),
    role: user.admin ? 'Admin' : user.kind || 'User',
  }
}

export function AuthProvider({ children }) {
  const stored = readAuthState()
  const [token, setToken] = useState(stored?.access_token || null)
  const [expiresAt, setExpiresAt] = useState(stored?.expires_at || null)
  const [user, setUser] = useState(decorateUser(stored?.user))
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(stored?.access_token))

  const logout = useCallback(() => {
    clearAuthState()
    setToken(null)
    setExpiresAt(null)
    setUser(null)
    setIsBootstrapping(false)
  }, [setExpiresAt, setIsBootstrapping, setToken, setUser])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    authApi.currentUser()
      .then((currentUser) => {
        if (cancelled) return
        const nextUser = decorateUser(currentUser)
        setUser(nextUser)
        writeAuthState({ access_token: token, expires_at: expiresAt, user: currentUser })
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false)
      })

    return () => {
      cancelled = true
    }
  }, [expiresAt, logout, token])

  useEffect(() => {
    function handleUnauthorized() {
      logout()
    }

    window.addEventListener('mlwarden:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('mlwarden:unauthorized', handleUnauthorized)
  }, [logout])

  const login = useCallback(async (username, password) => {
    const tokenResponse = await authApi.login({ username, password })
    writeAuthState({
      access_token: tokenResponse.access_token,
      expires_at: tokenResponse.expires_at,
      user: null,
    })
    let currentUser
    try {
      currentUser = await authApi.currentUser()
    } catch (error) {
      clearAuthState()
      throw error
    }
    const nextUser = decorateUser(currentUser)
    writeAuthState({
      access_token: tokenResponse.access_token,
      expires_at: tokenResponse.expires_at,
      user: currentUser,
    })
    setToken(tokenResponse.access_token)
    setExpiresAt(tokenResponse.expires_at)
    setUser(nextUser)
    setIsBootstrapping(false)
    return nextUser
  }, [setExpiresAt, setIsBootstrapping, setToken, setUser])

  const value = useMemo(
    () => ({
      token,
      expiresAt,
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [expiresAt, isBootstrapping, login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
