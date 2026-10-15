import React, { useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/client'

interface ValidacionResult {
  id: number
  resultado: 'APROBADA' | 'SIN_ACUERDO' | 'CERTIFICACION_VENCIDA' | 'RECHAZADA'
  detalle: string | null
  beneficios: string | null
  numero_oec_consultado: string | null
  pais_solicitante: string | null
  created_at: string
}

const RESULTADO_CONFIG = {
  APROBADA: {
    label: 'Aprobada',
    bg: 'bg-emerald-900/50 border-emerald-600',
    text: 'text-emerald-300',
    icon: '✓',
    desc: 'El operador tiene certificación OEC vigente y existe Acuerdo ARM activo.',
  },
  SIN_ACUERDO: {
    label: 'Sin Acuerdo',
    bg: 'bg-amber-900/50 border-amber-600',
    text: 'text-amber-300',
    icon: '⚠',
    desc: 'No existe un Acuerdo de Reconocimiento Mutuo activo entre los países.',
  },
  CERTIFICACION_VENCIDA: {
    label: 'Certificación Vencida',
    bg: 'bg-orange-900/50 border-orange-600',
    text: 'text-orange-300',
    icon: '⏰',
    desc: 'La certificación OEC del operador está vencida.',
  },
  RECHAZADA: {
    label: 'Rechazada',
    bg: 'bg-red-900/50 border-red-600',
    text: 'text-red-300',
    icon: '✕',
    desc: 'La certificación no está vigente o el operador no fue encontrado.',
  },
}

const PAISES_ISO = [
  { codigo: 'US', nombre: 'Estados Unidos (C-TPAT)' },
  { codigo: 'BR', nombre: 'Brasil (OEA)' },
  { codigo: 'KR', nombre: 'Corea del Sur (AEO)' },
  { codigo: 'IL', nombre: 'Israel (AEO)' },
  { codigo: 'AR', nombre: 'Argentina (OEA)' },
  { codigo: 'UY', nombre: 'Uruguay (OEC)' },
]

export default function Validacion() {
  const [numeroOec, setNumeroOec] = useState('')
  const [paisSolicitante, setPaisSolicitante] = useState('')
  const [result, setResult] = useState<ValidacionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!numeroOec.trim()) errs.numeroOec = 'Ingresá el número OEC'
    if (!paisSolicitante) errs.paisSolicitante = 'Seleccioná el país solicitante'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.post('/validaciones/', {
        numero_oec: numeroOec.trim(),
        pais_solicitante: paisSolicitante,
      })
      setResult(res.data)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      let msg = 'Error al procesar la validación'
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ')
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const config = result ? RESULTADO_CONFIG[result.resultado] : null

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-white">Validación ARM</h1>
          <p className="text-slate-400 mt-1">
            Consultá si un operador tiene OEC vigente y existe acuerdo de reconocimiento mutuo.
          </p>
        </div>

        <div className="card mb-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Número OEC del Operador
              </label>
              <input
                type="text"
                className={`input-field font-mono ${fieldErrors.numeroOec ? 'ring-2 ring-red-500 border-transparent' : ''}`}
                placeholder="Ej: OEC-UY-2024-001"
                value={numeroOec}
                onChange={e => {
                  setNumeroOec(e.target.value)
                  if (fieldErrors.numeroOec) setFieldErrors(p => ({ ...p, numeroOec: '' }))
                }}
              />
              {fieldErrors.numeroOec && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.numeroOec}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                País Solicitante
              </label>
              <select
                className={`input-field ${fieldErrors.paisSolicitante ? 'ring-2 ring-red-500 border-transparent' : ''}`}
                value={paisSolicitante}
                onChange={e => {
                  setPaisSolicitante(e.target.value)
                  if (fieldErrors.paisSolicitante) setFieldErrors(p => ({ ...p, paisSolicitante: '' }))
                }}
              >
                <option value="">Seleccioná un país...</option>
                {PAISES_ISO.map(p => (
                  <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
                ))}
              </select>
              {fieldErrors.paisSolicitante && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.paisSolicitante}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Procesando consulta...
                </span>
              ) : 'Consultar Validación ARM'}
            </button>
          </form>
        </div>

        {/* Resultado */}
        {result && config && (
          <div className={`rounded-xl border p-6 ${config.bg}`}>
            <div className="flex items-start gap-4">
              <div className={`text-3xl font-bold ${config.text} flex-shrink-0`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <h3 className={`font-display text-xl font-bold ${config.text} mb-1`}>
                  {config.label}
                </h3>
                <p className="text-slate-300 text-sm mb-4">{result.detalle || config.desc}</p>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500 text-xs uppercase tracking-wider">OEC Consultado</dt>
                    <dd className="text-slate-200 font-mono mt-0.5">{result.numero_oec_consultado}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs uppercase tracking-wider">País Solicitante</dt>
                    <dd className="text-slate-200 mt-0.5">{result.pais_solicitante}</dd>
                  </div>
                  {result.beneficios && (
                    <div className="col-span-2 mt-2">
                      <dt className="text-slate-500 text-xs uppercase tracking-wider">Beneficios aplicables</dt>
                      <dd className="text-emerald-300 mt-0.5">{result.beneficios}</dd>
                    </div>
                  )}
                  <div className="col-span-2 mt-1">
                    <dt className="text-slate-500 text-xs uppercase tracking-wider">ID Consulta</dt>
                    <dd className="text-slate-400 font-mono text-xs mt-0.5">#{result.id}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Referencia de OECs de prueba */}
        <div className="mt-6 card bg-navy-950/50">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">OECs de prueba</p>
          <div className="space-y-1 font-mono text-xs text-slate-400">
            <p><span className="text-emerald-400">OEC-UY-2024-001</span> → vigente (APROBADA con BR, US, KR, IL)</p>
            <p><span className="text-orange-400">OEC-UY-2020-099</span> → vencida (CERTIFICACION_VENCIDA)</p>
            <p><span className="text-slate-500">OEC-UY-2025-002</span> → en proceso (RECHAZADA)</p>
            <p><span className="text-amber-400">OEC-UY-2024-001 + AR</span> → sin acuerdo (SIN_ACUERDO)</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
