import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Settings2, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROL_LABEL } from '../lib/status'
import { initials } from '../lib/format'
import type { Rol } from '../lib/types'
import { BrandMark } from './ui'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Rol[]
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['operador', 'admin', 'aduana'] },
  { to: '/validacion', label: 'Validación ARM', icon: ShieldCheck, roles: ['aduana', 'admin'] },
  { to: '/admin', label: 'Administración', icon: Settings2, roles: ['admin'] },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV.filter(l => user && l.roles.includes(user.rol))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-950"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-50 border-b border-navy-800 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link to="/dashboard" className="flex shrink-0 items-center gap-3 rounded-lg">
              <BrandMark className="h-9 w-9" />
              <span className="hidden leading-tight sm:block">
                <span className="block font-display text-[17px] font-semibold text-white">Portal ARM</span>
                <span className="block text-xs text-slate-400">Reconocimiento Mutuo Aduanero</span>
              </span>
            </Link>
            <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
              {links.map(link => <NavItemLink key={link.to} item={link} />)}
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-2.5 rounded-full border border-navy-800 bg-navy-900 py-1 pl-1 pr-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold tracking-wide text-gold-300"
                >
                  {initials(user.email)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="hidden max-w-[14rem] truncate text-sm font-medium text-slate-100 sm:block">{user.email}</span>
                  <span className="block text-xs text-slate-400">{ROL_LABEL[user.rol]}</span>
                </span>
              </div>
              <button type="button" onClick={handleLogout} className="btn-ghost h-10 px-3" title="Cerrar sesión">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only lg:not-sr-only">Salir</span>
              </button>
            </div>
          )}
        </div>

        {links.length > 1 && (
          <nav aria-label="Principal" className="flex gap-1 overflow-x-auto border-t border-navy-800/70 px-3 py-2 md:hidden">
            {links.map(link => <NavItemLink key={link.to} item={link} />)}
          </nav>
        )}
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>

      <footer className="border-t border-navy-800/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <p>Portal ARM · Validación de Operadores Económicos Calificados</p>
          <p>DNA Uruguay</p>
        </div>
      </footer>
    </div>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-navy-800 text-white ring-1 ring-inset ring-navy-700'
            : 'text-slate-400 hover:bg-navy-900 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : ''}`} aria-hidden="true" />
          {item.label}
        </>
      )}
    </NavLink>
  )
}
