import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Completá todos los campos')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, rol, email: userEmail } = res.data
      login(userEmail, rol, access_token)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Credenciales inválidas'
      setError(typeof msg === 'string' ? msg : 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-500 rounded-2xl mb-4 shadow-lg shadow-gold-500/20">
            <span className="font-display font-bold text-navy-950 text-2xl">A</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Portal ARM</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Acuerdos de Reconocimiento Mutuo Aduanero
          </p>
        </div>

        {/* Form */}
        <div className="card shadow-2xl shadow-black/40">
          <h2 className="font-display text-xl font-semibold text-white mb-6">Ingresar al sistema</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verificando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-navy-800">
            <p className="text-xs text-slate-500 text-center mb-3">Usuarios de prueba</p>
            <div className="space-y-1.5 font-mono text-xs text-slate-400">
              <p><span className="text-gold-400">admin</span>@portal-arm.uy / Admin123!</p>
              <p><span className="text-gold-400">operador</span>@empresauy.com / Oper123!</p>
              <p><span className="text-gold-400">aduana</span>@dna.gub.uy / Aduana123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
