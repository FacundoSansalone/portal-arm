import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

interface Pais {
  id: number
  nombre: string
  codigo_iso: string
  programa_oea: string | null
}

interface Operador {
  id: number
  razon_social: string
  rut: string
  contacto_email: string | null
  pais: Pais
}

interface Certificacion {
  id: number
  numero_oec: string
  estado: 'en_proceso' | 'vigente' | 'vencida' | 'rechazada'
  fecha_emision: string | null
  fecha_vencimiento: string | null
}

interface DashboardData {
  operador: Operador | null
  certificacion: Certificacion | null
}

const ESTADO_STYLES: Record<string, string> = {
  vigente: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50',
  en_proceso: 'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  vencida: 'bg-red-900/50 text-red-300 border border-red-700/50',
  rechazada: 'bg-slate-800 text-slate-400 border border-slate-700',
}

const ESTADO_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  en_proceso: 'En Proceso',
  vencida: 'Vencida',
  rechazada: 'Rechazada',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    api.get('/operadores/mi-dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('No se pudo cargar la información'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.rol === 'operador') {
      cargar()
    } else {
      setLoading(false)
    }
  }, [user])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando...
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Bienvenido/a, <span className="text-slate-200">{user?.email}</span>
            {' '}· <span className="capitalize text-gold-400">{user?.rol}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 mb-6">
            {error}
          </div>
        )}

        {user?.rol === 'operador' && (
          <>
            {!data?.operador ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  Sin perfil de operador
                </h3>
                <p className="text-slate-400 text-sm">
                  Tu cuenta aún no tiene un perfil de empresa asociado. Contactá al administrador.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Datos del operador */}
                <div className="card">
                  <h2 className="font-display text-lg font-semibold text-white mb-4">
                    Datos del Operador
                  </h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-slate-500 uppercase tracking-wider">Razón Social</dt>
                      <dd className="text-white font-medium mt-0.5">{data.operador.razon_social}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase tracking-wider">RUT</dt>
                      <dd className="text-slate-200 font-mono mt-0.5">{data.operador.rut}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase tracking-wider">País</dt>
                      <dd className="text-slate-200 mt-0.5">
                        {data.operador.pais.nombre}
                        {data.operador.pais.programa_oea && (
                          <span className="ml-2 badge bg-navy-700 text-slate-300">
                            {data.operador.pais.programa_oea}
                          </span>
                        )}
                      </dd>
                    </div>
                    {data.operador.contacto_email && (
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wider">Contacto</dt>
                        <dd className="text-slate-200 mt-0.5">{data.operador.contacto_email}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Certificación */}
                <div className="card">
                  <h2 className="font-display text-lg font-semibold text-white mb-4">
                    Certificación OEC
                  </h2>
                  {!data.certificacion ? (
                    <SolicitarCertificacion operadorId={data.operador.id} onDone={cargar} />
                  ) : (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wider">Número OEC</dt>
                        <dd className="text-white font-mono font-medium mt-0.5">
                          {data.certificacion.numero_oec}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wider">Estado</dt>
                        <dd className="mt-1">
                          <span className={`badge ${ESTADO_STYLES[data.certificacion.estado]}`}>
                            {ESTADO_LABELS[data.certificacion.estado]}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wider">Fecha de Emisión</dt>
                        <dd className="text-slate-200 mt-0.5">{formatDate(data.certificacion.fecha_emision)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500 uppercase tracking-wider">Vencimiento</dt>
                        <dd className="text-slate-200 mt-0.5">{formatDate(data.certificacion.fecha_vencimiento)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {user?.rol === 'aduana' && (
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-white mb-3">
              Sistema de Validación ARM
            </h2>
            <p className="text-slate-400 mb-4">
              Como usuario de Aduana, podés consultar si un operador tiene su certificación OEC
              vigente y si existe un Acuerdo de Reconocimiento Mutuo activo con su país de origen.
            </p>
            <Link to="/validacion" className="btn-primary inline-block">
              Ir a Validación ARM →
            </Link>
          </div>
        )}

        {user?.rol === 'admin' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="font-display text-lg font-semibold text-white mb-3">Administración</h2>
              <p className="text-slate-400 text-sm mb-4">
                Revisá y aprobá las solicitudes de certificación OEC pendientes.
              </p>
              <Link to="/admin" className="btn-primary inline-block">
                Ver certificaciones pendientes →
              </Link>
            </div>
            <div className="card">
              <h2 className="font-display text-lg font-semibold text-white mb-3">Validaciones</h2>
              <p className="text-slate-400 text-sm mb-4">
                También podés realizar consultas de validación ARM.
              </p>
              <Link to="/validacion" className="btn-secondary inline-block">
                Ir a Validación →
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function SolicitarCertificacion({ operadorId, onDone }: { operadorId: number; onDone: () => void }) {
  const [numeroOec, setNumeroOec] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setMsg(''); setLoading(true)
    try {
      await api.post(`/operadores/${operadorId}/certificaciones`, {
        numero_oec: numeroOec.trim(),
        fecha_vencimiento: vencimiento ? new Date(vencimiento).toISOString() : null,
      })
      setMsg('Solicitud enviada. Queda en estado "en proceso" hasta su aprobación.')
      setNumeroOec(''); setVencimiento('')
      setTimeout(onDone, 1200)
    } catch (e: any) {
      const d = e?.response?.data?.detail
      setErr(Array.isArray(d) ? d.map((x: any) => x.msg).join('; ') : (d || 'No se pudo crear la solicitud'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-slate-400 text-sm mb-4">
        No tenés certificaciones todavía. Solicitá una nueva certificación OEC:
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input className="input-field font-mono" placeholder="Número OEC (ej: OEC-UY-2026-010)"
               value={numeroOec} onChange={e => setNumeroOec(e.target.value)} />
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Vencimiento propuesto (opcional)</label>
          <input type="date" className="input-field" value={vencimiento} onChange={e => setVencimiento(e.target.value)} />
        </div>
        {err && <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-2 text-red-300 text-sm">{err}</div>}
        {msg && <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-lg px-4 py-2 text-emerald-300 text-sm">{msg}</div>}
        <button disabled={loading} className="btn-primary text-sm px-4 py-2">
          {loading ? 'Enviando...' : 'Solicitar certificación'}
        </button>
      </form>
    </div>
  )
}
