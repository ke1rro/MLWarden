import { useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'

const AUTH_STORAGE_KEY = 'mlwarden.fakeAuth'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login(username) {
        const nextUser = {
          username: username || 'admin',
          initials: (username || 'admin').slice(0, 2).toUpperCase(),
          role: 'Owner',
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
        setUser(nextUser)
      },
      logout() {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
