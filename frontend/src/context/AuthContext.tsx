import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Rol } from '../lib/types'

const STORAGE_KEY = 'arm_user'

interface AuthUser {
  email: string
  rol: Rol
  token: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, rol: Rol, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Lectura sincrónica al montar: evita un render intermedio "sin sesión" y el parpadeo de carga
function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const login = useCallback((email: string, rol: Rol, token: string) => {
    const u: AuthUser = { email, rol, token }
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
