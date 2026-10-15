import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthUser {
  email: string
  rol: 'admin' | 'operador' | 'aduana'
  token: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, rol: string, token: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('arm_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('arm_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (email: string, rol: string, token: string) => {
    const u: AuthUser = { email, rol: rol as AuthUser['rol'], token }
    setUser(u)
    localStorage.setItem('arm_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('arm_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
