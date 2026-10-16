import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Building2, Eye, EyeOff, FileCheck2, Handshake, Landmark, ScrollText, UserCog, type LucideIcon,
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useApi'
import { getErrorMessage } from '../lib/errors'
import type { Rol } from '../lib/types'
import { Alert, BrandMark, Field, Spinner } from '../components/ui'

interface DemoAccount {
  rol: string
  email: string
  password: string
  icon: LucideIcon
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { rol: 'Administrador', email: 'admin@portal-arm.uy', password: 'Admin123!', icon: UserCog },
  { rol: 'Aduana', email: 'aduana@dna.gub.uy', password: 'Aduana123!', icon: Landmark },
  { rol: 'Operador', email: 'operador@empresauy.com', password: 'Oper123!', icon: Building2 },
]

const CRITERIOS = [
  { icon: FileCheck2, title: 'Certificación OEC vigente', text: 'El operador está certificado por la aduana de su país.' },
  { icon: Handshake, title: 'Acuerdo ARM activo', text: 'Entre el país del operador y la aduana que consulta.' },
  { icon: ScrollText, title: 'Resultado trazable', text: 'Cada consulta queda registrada y se notifica de forma asincrónica.' },
]

interface LoginResponse {
  access_token: string
  rol: Rol
  email: string
}

export default function Login() {
  useDocumentTitle('Ingresar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!email.trim()) errs.email = 'Ingresá tu correo electrónico'
    if (!password) errs.password = 'Ingresá tu contraseña'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setError('')
    setLoading(true)
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password })
      login(res.data.email, res.data.rol, res.data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Credenciales inválidas'))
      setLoading(false)
    }
  }

  const usarCuenta = (cuenta: DemoAccount) => {
    setEmail(cuenta.email)
    setPassword(cuenta.password)
    setFieldErrors({})
    setError('')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Panel institucional */}
      <aside className="security-paper relative hidden overflow-hidden border-r border-navy-800 bg-navy-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900/30 via-navy-900/80 to-navy-950" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold text-white">Portal ARM</p>
              <p className="text-xs text-slate-400">Reconocimiento Mutuo Aduanero</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="eyebrow text-gold-400">Acuerdos de Reconocimiento Mutuo</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.15] text-white xl:text-[2.6rem]">
              Validación de Operadores Económicos Calificados entre aduanas.
            </h1>
            <ul className="mt-10 space-y-6">
              {CRITERIOS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-navy-700 bg-navy-800/80 text-gold-400">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-400">Proyecto de Sistemas Distribuidos · Universidad de Montevideo</p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-10 flex flex-col items-center text-center lg:hidden">
            <BrandMark className="h-12 w-12" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-white">Portal ARM</h1>
            <p className="mt-1 text-sm text-slate-400">Reconocimiento Mutuo Aduanero</p>
          </div>

          <h2 className="font-display text-2xl font-semibold text-white">Ingresar al sistema</h2>
          <p className="mt-1 text-sm text-slate-400">Usá tu cuenta institucional para continuar.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <Field id="email" label="Correo electrónico" error={fieldErrors.email}>
              {a11y => (
                <input
                  {...a11y}
                  type="email"
                  className="input-field"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined }))
                  }}
                  autoComplete="email"
                />
              )}
            </Field>

            <Field id="password" label="Contraseña" error={fieldErrors.password}>
              {a11y => (
                <div className="relative">
                  <input
                    {...a11y}
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined }))
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-white"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                      : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              )}
            </Field>

            {error && <Alert>{error}</Alert>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <>
                  <Spinner />
                  Verificando…
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <section aria-labelledby="demo-titulo" className="mt-10">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-navy-800" aria-hidden="true" />
              <h3 id="demo-titulo" className="eyebrow font-body">Cuentas de prueba</h3>
              <span className="h-px flex-1 bg-navy-800" aria-hidden="true" />
            </div>
            <ul className="mt-4 grid gap-2">
              {DEMO_ACCOUNTS.map(cuenta => {
                const Icon = cuenta.icon
                return (
                  <li key={cuenta.email}>
                    <button
                      type="button"
                      onClick={() => usarCuenta(cuenta)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-navy-800 bg-navy-900/60 px-3 py-2.5 text-left transition-colors hover:border-navy-600 hover:bg-navy-900"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-800 text-gold-400">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-100">{cuenta.rol}</span>
                        <span className="block truncate font-mono text-xs text-slate-400">{cuenta.email}</span>
                      </span>
                      <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-gold-300">
                        Usar
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-center text-xs text-slate-400">
              Al elegir una cuenta se completan sus credenciales.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
