import { useRef, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, FlaskConical, History, RotateCcw, ShieldCheck, Stamp } from 'lucide-react'
import Layout from '../components/Layout'
import ValidacionesTable from '../components/ValidacionesTable'
import { Alert, CardHeader, Field, PageHeader, Skeleton, Spinner } from '../components/ui'
import { useApi, useDocumentTitle } from '../hooks/useApi'
import api from '../api/client'
import { getErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import { RESULTADO_META, TONE_BADGE, TONE_SURFACE, TONE_TEXT, type Tone } from '../lib/status'
import type { Pais, ResultadoValidacion, Validacion as ValidacionResult, ValidacionList } from '../lib/types'

// Datos cargados por scripts/seed.py: UY tiene acuerdo activo con BR, US, KR e IL (no con AR)
const CASOS_PRUEBA: { oec: string; pais: string; resultado: ResultadoValidacion }[] = [
  { oec: 'OEC-UY-2024-001', pais: 'BR', resultado: 'APROBADA' },
  { oec: 'OEC-UY-2024-001', pais: 'AR', resultado: 'SIN_ACUERDO' },
  { oec: 'OEC-UY-2020-099', pais: 'BR', resultado: 'CERTIFICACION_VENCIDA' },
  { oec: 'OEC-UY-2025-002', pais: 'BR', resultado: 'RECHAZADA' },
]

const FILTROS: { value: ResultadoValidacion | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'SIN_ACUERDO', label: 'Sin acuerdo' },
  { value: 'CERTIFICACION_VENCIDA', label: 'Vencidas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
]

const PAGE_SIZE = 8

export default function Validacion() {
  useDocumentTitle('Validación ARM')
  const paises = useApi<Pais[]>('/admin/paises')

  const [numeroOec, setNumeroOec] = useState('')
  const [paisSolicitante, setPaisSolicitante] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ numeroOec?: string; paisSolicitante?: string }>({})
  const [result, setResult] = useState<ValidacionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const oecRef = useRef<HTMLInputElement>(null)

  const [filtro, setFiltro] = useState<ResultadoValidacion | ''>('')
  const [page, setPage] = useState(0)
  const historial = useApi<ValidacionList>('/validaciones/', {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    resultado: filtro || undefined,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!numeroOec.trim()) errs.numeroOec = 'Ingresá el número OEC'
    if (!paisSolicitante) errs.paisSolicitante = 'Seleccioná el país solicitante'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.post<ValidacionResult>('/validaciones/', {
        numero_oec: numeroOec.trim(),
        pais_solicitante: paisSolicitante,
      })
      setResult(res.data)
      historial.reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al procesar la validación'))
    } finally {
      setLoading(false)
    }
  }

  const cargarCaso = (caso: (typeof CASOS_PRUEBA)[number]) => {
    setNumeroOec(caso.oec)
    setPaisSolicitante(caso.pais)
    setFieldErrors({})
    setError('')
  }

  const nuevaConsulta = () => {
    setResult(null)
    setNumeroOec('')
    setPaisSolicitante('')
    setError('')
    oecRef.current?.focus()
  }

  const total = historial.data?.total ?? 0
  const desde = total === 0 ? 0 : page * PAGE_SIZE + 1
  const hasta = Math.min(total, (page + 1) * PAGE_SIZE)

  return (
    <Layout>
      <PageHeader
        eyebrow="Aduana"
        title="Validación ARM"
        description="Verificá si un operador tiene su certificación OEC vigente y si existe un Acuerdo de Reconocimiento Mutuo activo con el país que consulta."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="consulta-titulo">
          <CardHeader id="consulta-titulo" icon={ShieldCheck} title="Nueva consulta" />
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Field id="numero-oec" label="Número OEC del operador" error={fieldErrors.numeroOec}>
              {a11y => (
                <input
                  {...a11y}
                  ref={oecRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  className="input-field font-mono tracking-wide"
                  placeholder="OEC-UY-2024-001"
                  value={numeroOec}
                  onChange={e => {
                    setNumeroOec(e.target.value.toUpperCase())
                    if (fieldErrors.numeroOec) setFieldErrors(p => ({ ...p, numeroOec: undefined }))
                  }}
                />
              )}
            </Field>

            <Field id="pais-solicitante" label="País solicitante" error={fieldErrors.paisSolicitante ?? paises.error ?? undefined}>
              {a11y => (
                <select
                  {...a11y}
                  className="input-field"
                  value={paisSolicitante}
                  disabled={paises.loading}
                  onChange={e => {
                    setPaisSolicitante(e.target.value)
                    if (fieldErrors.paisSolicitante) setFieldErrors(p => ({ ...p, paisSolicitante: undefined }))
                  }}
                >
                  <option value="">{paises.loading ? 'Cargando países…' : 'Seleccioná un país'}</option>
                  {paises.data?.map(p => (
                    <option key={p.id} value={p.codigo_iso}>
                      {p.nombre}{p.programa_oea ? ` (${p.programa_oea})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {error && <Alert>{error}</Alert>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {loading ? 'Procesando consulta…' : 'Consultar validación'}
            </button>
          </form>

          <div className="mt-6 border-t border-navy-800 pt-5">
            <h3 className="eyebrow mb-3 flex items-center gap-2 font-body">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              Casos de prueba
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {CASOS_PRUEBA.map(caso => {
                const meta = RESULTADO_META[caso.resultado]
                return (
                  <li key={`${caso.oec}-${caso.pais}`}>
                    <button
                      type="button"
                      onClick={() => cargarCaso(caso)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-800 bg-navy-950/40 px-3 py-2 text-left transition-colors hover:border-navy-600 hover:bg-navy-800/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs text-slate-200">{caso.oec}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                          desde <span className="code-chip">{caso.pais}</span>
                        </span>
                      </span>
                      <span className={`badge shrink-0 ${TONE_BADGE[meta.tone]}`}>{meta.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="resultado-titulo" aria-live="polite" aria-busy={loading}>
          <h2 id="resultado-titulo" className="sr-only">Resultado</h2>
          {loading ? <ResultadoSkeleton /> : result ? <Veredicto result={result} onReset={nuevaConsulta} /> : <ResultadoVacio />}
        </section>
      </div>

      <section id="historial" className="card mt-6" aria-labelledby="historial-titulo">
        <CardHeader
          id="historial-titulo"
          icon={History}
          title="Historial de consultas"
          description={historial.data ? `${total} ${total === 1 ? 'consulta registrada' : 'consultas registradas'}` : undefined}
        />

        <div role="group" aria-label="Filtrar por resultado" className="mb-4 flex flex-wrap gap-1.5">
          {FILTROS.map(f => {
            const activo = filtro === f.value
            return (
              <button
                key={f.value || 'todas'}
                type="button"
                aria-pressed={activo}
                onClick={() => {
                  setFiltro(f.value)
                  setPage(0)
                }}
                className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                  activo
                    ? 'border-gold-500/50 bg-gold-500/10 text-gold-300'
                    : 'border-navy-700 text-slate-400 hover:border-navy-600 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {historial.error ? (
          <Alert>{historial.error}</Alert>
        ) : (
          <ValidacionesTable
            items={historial.data?.items}
            loading={historial.loading}
            emptyTitle={filtro ? 'Sin resultados' : undefined}
            emptyDescription={filtro ? 'No hay consultas con ese resultado.' : 'Las validaciones que realices aparecerán acá.'}
          />
        )}

        {total > PAGE_SIZE && (
          <nav aria-label="Paginación del historial" className="mt-4 flex items-center justify-between gap-3 border-t border-navy-800 pt-4 text-sm">
            <p className="tabular-nums text-slate-400">
              {desde}–{hasta} de {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm h-9"
                disabled={page === 0 || historial.loading}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm h-9"
                disabled={hasta >= total || historial.loading}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </section>
    </Layout>
  )
}

function ResultadoVacio() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-navy-700 bg-navy-900/30 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-navy-600 text-navy-400">
        <Stamp className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-slate-200">Esperando consulta</p>
      <p className="mt-1 max-w-xs text-sm text-slate-400">
        El veredicto aparecerá acá con el detalle del acuerdo y los beneficios aplicables.
      </p>
    </div>
  )
}

function ResultadoSkeleton() {
  return (
    <div className="card h-full min-h-[320px] space-y-4">
      <span className="sr-only">Procesando consulta…</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-44" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="grid grid-cols-2 gap-4 pt-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
      </div>
    </div>
  )
}

function Veredicto({ result, onReset }: { result: ValidacionResult; onReset: () => void }) {
  const meta = RESULTADO_META[result.resultado]
  const Icon = meta.icon

  return (
    <article className={`relative h-full animate-fade-up overflow-hidden rounded-xl border p-6 shadow-card ${TONE_SURFACE[meta.tone]}`}>
      <Sello label={meta.label} tone={meta.tone} />

      <div className="flex items-center gap-3 pr-28">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-950/60 ${TONE_TEXT[meta.tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Resultado de la validación</p>
          <p className={`font-display text-2xl font-semibold ${TONE_TEXT[meta.tone]}`}>{meta.label}</p>
        </div>
      </div>

      <p className="mt-5 pr-4 text-sm text-slate-300">{result.detalle || meta.description}</p>

      {result.beneficios && (
        <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-3">
          <p className="eyebrow text-emerald-300/90">Beneficios aplicables</p>
          <p className="mt-1 text-sm text-emerald-100">{result.beneficios}</p>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-5 text-sm">
        <div>
          <dt className="eyebrow">OEC consultado</dt>
          <dd className="mt-1 break-all font-mono text-slate-100">{result.numero_oec_consultado ?? '—'}</dd>
        </div>
        <div>
          <dt className="eyebrow">País solicitante</dt>
          <dd className="mt-1">{result.pais_solicitante ? <span className="code-chip">{result.pais_solicitante}</span> : '—'}</dd>
        </div>
        <div>
          <dt className="eyebrow">Fecha y hora</dt>
          <dd className="mt-1 tabular-nums text-slate-300">{formatDateTime(result.created_at)}</dd>
        </div>
        <div>
          <dt className="eyebrow">N.º de consulta</dt>
          <dd className="mt-1 font-mono text-slate-300">#{result.id}</dd>
        </div>
      </dl>

      <button type="button" onClick={onReset} className="btn-secondary btn-sm mt-6 h-9">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Nueva consulta
      </button>
    </article>
  )
}

// Sello aduanero decorativo: refuerza visualmente el veredicto (el texto ya está en el título)
function Sello({ label, tone }: { label: string; tone: Tone }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute right-5 top-5 flex h-24 w-24 animate-stamp items-center justify-center rounded-full border-[2.5px] border-current opacity-80 ${TONE_TEXT[tone]}`}
    >
      <div className="flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full border border-dashed border-current px-1.5 text-center">
        <span className="text-[8px] font-semibold uppercase tracking-[0.22em]">ARM</span>
        <span className="my-0.5 font-mono text-[11px] font-bold uppercase leading-tight tracking-wide">{label}</span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.22em]">Aduana</span>
      </div>
    </div>
  )
}
