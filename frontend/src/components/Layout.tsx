import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', roles: ['operador', 'admin', 'aduana'] },
    { to: '/validacion', label: 'Validación ARM', roles: ['aduana', 'admin'] },
    { to: '/admin', label: 'Administración', roles: ['admin'] },
  ]

  const visibleLinks = navLinks.filter(l => user && l.roles.includes(user.rol))

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 border-b border-navy-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gold-500 rounded flex items-center justify-center">
                  <span className="text-navy-950 font-display font-bold text-sm">A</span>
                </div>
                <div>
                  <span className="font-display font-semibold text-white text-lg leading-none block">Portal ARM</span>
                  <span className="text-slate-400 text-xs">Reconocimiento Mutuo Aduanero</span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {visibleLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-navy-700 text-gold-400'
                        : 'text-slate-300 hover:text-white hover:bg-navy-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-white font-medium">{user.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{user.rol}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 text-sm font-medium transition-colors"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 text-xs">
            Portal ARM — Sistema de Validación de Operadores Económicos Calificados · DNA Uruguay
          </p>
        </div>
      </footer>
    </div>
  )
}
