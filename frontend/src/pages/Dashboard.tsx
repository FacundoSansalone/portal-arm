import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, Building2, CalendarX2, CircleCheck, ClipboardList, FileBadge2, Globe2, Handshake,
  Hash, History, Mail, Send, ShieldCheck, TriangleAlert, type LucideIcon,
} from 'lucide-react'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import AcuerdosPanel from '../components/AcuerdosPanel'
import ValidacionesTable from '../components/ValidacionesTable'
import { useToast } from '../components/Toast'
import { Alert, CardHeader, EmptyState, Field, PageHeader, Skeleton, Spinner, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useApi, useDocumentTitle } from '../hooks/useApi'
import api from '../api/client'
import { getErrorMessage } from '../lib/errors'
import { daysUntil, formatDate, parseApiDate, toApiDate } from '../lib/format'
import { CERT_META } from '../lib/status'
import type {
  Acuerdo, Certificacion, CertificacionConOperador, DashboardOperador, Operador, ValidacionList,
} from '../lib/types'

export default function Dashboard() {
  const { user } = useAuth()
  useDocumentTitle('Inicio')

  return (
    <Layout>
      {user?.rol === 'operador' && <OperadorDashboard />}
      {user?.rol === 'aduana' && <AduanaDashboard email={user.email} />}
      {user?.rol === 'admin' && <AdminDashboard email={user.email} />}
    </Layout>
  )
}

function porcentaje(parte: number | undefined, total: number | undefined): string | undefined {
  if (parte === undefined || !total) return undefined
  return `${Math.round((parte / total) * 100)}% del total`
}

/* --------------------------------- Aduana --------------------------------- */

function AduanaDashboard({ email }: { email: string }) {
  const recientes = useApi<ValidacionList>('/validaciones/', { limit: 6 })
  const aprobadas = useApi<ValidacionList>('/validaciones/', { limit: 1, resultado: 'APROBADA' })
  const sinAcuerdo = useApi<ValidacionList>('/validaciones/', { limit: 1, resultado: 'SIN_ACUERDO' })
  const vencidas = useApi<ValidacionList>('/validaciones/', { limit: 1, resultado: 'CERTIFICACION_VENCIDA' })
  const acuerdos = useApi<Acuerdo[]>('/admin/acuerdos-arm')
  const total = recientes.data?.total

  return (
    <>
      <PageHeader
        eyebrow="Aduana"
        title="Panel de control"
        description={<>Sesión iniciada como <span className="text-slate-200">{email}</span></>}
        actions={
          <Link to="/validacion" className="btn-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Nueva validación
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Consultas" value={total} icon={Activity} accent="slate" loading={!recientes.data && recientes.loading} hint="Validaciones registradas" />
        <StatCard label="Aprobadas" value={aprobadas.data?.total} icon={CircleCheck} accent="emerald" loading={aprobadas.loading} hint={porcentaje(aprobadas.data?.total, total)} />
        <StatCard label="Sin acuerdo" value={sinAcuerdo.data?.total} icon={TriangleAlert} accent="amber" loading={sinAcuerdo.loading} hint={porcentaje(sinAcuerdo.data?.total, total)} />
        <StatCard label="Vencidas" value={vencidas.data?.total} icon={CalendarX2} accent="red" loading={vencidas.loading} hint={porcentaje(vencidas.data?.total, total)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3" aria-labelledby="recientes-titulo">
          <CardHeader
            id="recientes-titulo"
            icon={History}
            title="Consultas recientes"
            action={
              <Link to="/validacion" className="btn-ghost btn-sm">
                Ver historial
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {recientes.error
            ? <Alert>{recientes.error}</Alert>
            : <ValidacionesTable items={recientes.data?.items} loading={recientes.loading} emptyDescription="Las validaciones que realices aparecerán acá." />}
        </section>

        <section className="card lg:col-span-2 lg:self-start" aria-labelledby="acuerdos-titulo">
          <CardHeader id="acuerdos-titulo" icon={Handshake} title="Acuerdos ARM" description="Países con reconocimiento mutuo." />
          {acuerdos.error
            ? <Alert>{acuerdos.error}</Alert>
            : <AcuerdosPanel compact acuerdos={acuerdos.data ?? []} loading={acuerdos.loading} />}
        </section>
      </div>
    </>
  )
}

/* ---------------------------------- Admin ---------------------------------- */

function AdminDashboard({ email }: { email: string }) {
  const pendientes = useApi<CertificacionConOperador[]>('/admin/certificaciones-pendientes')
  const acuerdos = useApi<Acuerdo[]>('/admin/acuerdos-arm')
  const recientes = useApi<ValidacionList>('/validaciones/', { limit: 6 })
  const aprobadas = useApi<ValidacionList>('/validaciones/', { limit: 1, resultado: 'APROBADA' })

  const cantPendientes = pendientes.data?.length
  const activos = acuerdos.data?.filter(a => a.estado === 'activo').length
  const total = recientes.data?.total
  const tasa = total && aprobadas.data ? `${Math.round((aprobadas.data.total / total) * 100)}%` : total === 0 ? '—' : undefined

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Panel de control"
        description={<>Sesión iniciada como <span className="text-slate-200">{email}</span></>}
        actions={
          <>
            <Link to="/validacion" className="btn-secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Validar
            </Link>
            <Link to="/admin" className="btn-primary">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Revisar solicitudes
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendientes" value={cantPendientes} icon={ClipboardList} accent={cantPendientes ? 'amber' : 'slate'} loading={pendientes.loading} hint="Solicitudes de certificación" />
        <StatCard label="Consultas" value={total} icon={Activity} accent="slate" loading={!recientes.data && recientes.loading} hint="Validaciones registradas" />
        <StatCard label="Aprobación" value={tasa} icon={CircleCheck} accent="emerald" loading={aprobadas.loading || (!recientes.data && recientes.loading)} hint="Consultas aprobadas" />
        <StatCard label="Acuerdos activos" value={activos} icon={Handshake} accent="gold" loading={acuerdos.loading} hint={acuerdos.data ? `de ${acuerdos.data.length} registrados` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-2" aria-labelledby="pendientes-titulo">
          <CardHeader
            id="pendientes-titulo"
            icon={ClipboardList}
            title="Solicitudes pendientes"
            action={cantPendientes ? (
              <Link to="/admin" className="btn-ghost btn-sm">
                Revisar
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : undefined}
          />
          {pendientes.loading && !pendientes.data ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pendientes.error ? (
            <Alert>{pendientes.error}</Alert>
          ) : !pendientes.data?.length ? (
            <EmptyState compact icon={CircleCheck} title="Todo al día" description="No hay certificaciones esperando aprobación." />
          ) : (
            <ul className="divide-y divide-navy-800/70">
              {pendientes.data.slice(0, 5).map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">{c.operador.razon_social}</p>
                    <p className="font-mono text-xs text-gold-300">{c.numero_oec}</p>
                  </div>
                  <span className="code-chip">{c.operador.pais.codigo_iso}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-3" aria-labelledby="recientes-admin-titulo">
          <CardHeader
            id="recientes-admin-titulo"
            icon={History}
            title="Consultas recientes"
            action={
              <Link to="/validacion" className="btn-ghost btn-sm">
                Ver historial
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {recientes.error
            ? <Alert>{recientes.error}</Alert>
            : <ValidacionesTable items={recientes.data?.items} loading={recientes.loading} />}
        </section>
      </div>
    </>
  )
}

/* -------------------------------- Operador -------------------------------- */

function OperadorDashboard() {
  const { data, error, loading, reload } = useApi<DashboardOperador>('/operadores/mi-dashboard')
  const consultas = useApi<ValidacionList>('/validaciones/', { limit: 5 })

  if (loading && !data) return <OperadorSkeleton />

  const operador = data?.operador

  return (
    <>
      <PageHeader
        eyebrow="Operador económico"
        title={operador?.razon_social ?? 'Mi panel'}
        description="Estado de tu certificación OEC y consultas de otras aduanas sobre tu empresa."
      />

      {error && <Alert className="mb-6">{error}</Alert>}

      {!operador ? (
        !error && (
          <div className="card">
            <EmptyState
              icon={Building2}
              title="Sin perfil de operador"
              description="Tu cuenta aún no tiene un perfil de empresa asociado. Contactá al administrador."
            />
          </div>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {data?.certificacion
              ? <Certificado cert={data.certificacion} operador={operador} />
              : (
                <section className="card h-full">
                  <SolicitarCertificacion operadorId={operador.id} onDone={reload} />
                </section>
              )}
          </div>

          <section className="card lg:col-span-2" aria-labelledby="operador-titulo">
            <CardHeader id="operador-titulo" icon={Building2} title="Datos del operador" />
            <DatosOperador operador={operador} />
          </section>

          <section className="card lg:col-span-5" aria-labelledby="consultas-titulo">
            <CardHeader
              id="consultas-titulo"
              icon={History}
              title="Consultas sobre tu OEC"
              description="Validaciones realizadas por aduanas de otros países."
            />
            {consultas.error
              ? <Alert>{consultas.error}</Alert>
              : (
                <ValidacionesTable
                  items={consultas.data?.items}
                  loading={consultas.loading}
                  emptyDescription="Cuando una aduana valide tu certificación, la consulta aparecerá acá."
                />
              )}
          </section>
        </div>
      )}
    </>
  )
}

function OperadorSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Cargando panel…</span>
      <Skeleton className="mb-3 h-3 w-32" />
      <Skeleton className="mb-8 h-9 w-72 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}

// Fracción del período de vigencia ya transcurrida (0..1)
function vigencia(cert: Certificacion): number | null {
  if (!cert.fecha_emision || !cert.fecha_vencimiento) return null
  const inicio = parseApiDate(cert.fecha_emision).getTime()
  const fin = parseApiDate(cert.fecha_vencimiento).getTime()
  if (fin <= inicio) return null
  return Math.min(1, Math.max(0, (Date.now() - inicio) / (fin - inicio)))
}

function plural(n: number, palabra: string) {
  return `${n} ${n === 1 ? palabra : `${palabra}s`}`
}

function Certificado({ cert, operador }: { cert: Certificacion; operador: Operador }) {
  const dias = cert.fecha_vencimiento ? daysUntil(cert.fecha_vencimiento) : null
  const progreso = vigencia(cert)
  const porVencer = dias !== null && dias <= 60

  return (
    <article aria-labelledby="cert-titulo" className="card security-paper relative h-full overflow-hidden p-0">
      <div className="h-full bg-gradient-to-br from-navy-900/40 via-navy-900/85 to-navy-900 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Certificado {operador.pais.programa_oea ?? 'OEC'} · {operador.pais.nombre}</p>
            <h2 id="cert-titulo" className="mt-2 break-all font-mono text-2xl font-medium tracking-tight text-white sm:text-[1.75rem]">
              {cert.numero_oec}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{operador.razon_social}</p>
          </div>
          <StatusBadge meta={CERT_META[cert.estado]} />
        </div>

        {cert.estado === 'vigente' && dias !== null && progreso !== null && (
          <div className="mt-7">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={porVencer ? 'text-amber-300' : 'text-slate-200'}>
                {dias >= 0 ? `Vence en ${plural(dias, 'día')}` : `Venció hace ${plural(-dias, 'día')}`}
              </span>
              <span className="tabular-nums text-slate-400">{Math.round(progreso * 100)}% del período</span>
            </div>
            <div
              role="progressbar"
              aria-label="Período de vigencia transcurrido"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progreso * 100)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-800"
            >
              <div
                className={`h-full rounded-full ${porVencer ? 'bg-amber-400' : 'bg-gold-500'}`}
                style={{ width: `${Math.max(progreso * 100, 2)}%` }}
              />
            </div>
          </div>
        )}

        {cert.estado === 'en_proceso' && (
          <Alert tone="info" className="mt-6">
            Tu solicitud está en revisión. Un administrador debe aprobarla para que quede vigente.
          </Alert>
        )}
        {cert.estado === 'vencida' && (
          <Alert className="mt-6">
            Las aduanas con acuerdo ARM verán tu certificación como vencida hasta que se renueve.
          </Alert>
        )}

        <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-navy-800 pt-5 sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Emisión</dt>
            <dd className="mt-1 tabular-nums text-slate-200">{formatDate(cert.fecha_emision)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Vencimiento</dt>
            <dd className="mt-1 tabular-nums text-slate-200">{formatDate(cert.fecha_vencimiento)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="eyebrow">País emisor</dt>
            <dd className="mt-1 flex items-center gap-2 text-slate-200">
              <span className="code-chip">{operador.pais.codigo_iso}</span>
              {operador.pais.nombre}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

function DatosOperador({ operador }: { operador: Operador }) {
  const filas: { icon: LucideIcon; label: string; value: ReactNode }[] = [
    { icon: Building2, label: 'Razón social', value: operador.razon_social },
    { icon: Hash, label: 'RUT', value: <span className="font-mono">{operador.rut}</span> },
    {
      icon: Globe2,
      label: 'País',
      value: (
        <span className="flex flex-wrap items-center gap-2">
          {operador.pais.nombre}
          {operador.pais.programa_oea && <span className="code-chip">{operador.pais.programa_oea}</span>}
        </span>
      ),
    },
  ]
  if (operador.contacto_email) filas.push({ icon: Mail, label: 'Contacto', value: operador.contacto_email })

  return (
    <dl className="divide-y divide-navy-800/70">
      {filas.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-100">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

function SolicitarCertificacion({ operadorId, onDone }: { operadorId: number; onDone: () => void }) {
  const notify = useToast()
  const [numeroOec, setNumeroOec] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const hoy = new Date().toISOString().slice(0, 10)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!numeroOec.trim()) {
      setFieldError('Ingresá el número OEC')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post(`/operadores/${operadorId}/certificaciones`, {
        numero_oec: numeroOec.trim(),
        fecha_vencimiento: toApiDate(vencimiento),
      })
      notify('Solicitud enviada. Queda en proceso hasta que un administrador la apruebe.')
      onDone()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la solicitud'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CardHeader
        icon={FileBadge2}
        title="Solicitar certificación OEC"
        description="Todavía no tenés una certificación registrada. Enviá la solicitud para que un administrador la revise."
      />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="numero-oec" label="Número OEC" error={fieldError} hint="Formato sugerido: OEC-UY-AAAA-NNN">
          {a11y => (
            <input
              {...a11y}
              className="input-field font-mono tracking-wide"
              placeholder="OEC-UY-2026-010"
              autoComplete="off"
              spellCheck={false}
              value={numeroOec}
              onChange={e => {
                setNumeroOec(e.target.value.toUpperCase())
                setFieldError('')
              }}
            />
          )}
        </Field>
        <Field id="vencimiento" label="Vencimiento propuesto" optional>
          {a11y => (
            <input {...a11y} type="date" min={hoy} className="input-field" value={vencimiento} onChange={e => setVencimiento(e.target.value)} />
          )}
        </Field>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {loading ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </>
  )
}
