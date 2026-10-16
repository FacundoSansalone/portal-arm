import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CircleCheck, Clock3, FileBadge2, Globe2, Handshake, Plus, X } from 'lucide-react'
import Layout from '../components/Layout'
import AcuerdosPanel from '../components/AcuerdosPanel'
import { Tabs, TabPanel, type TabItem } from '../components/Tabs'
import { useToast } from '../components/Toast'
import { Alert, CardHeader, EmptyState, Field, PageHeader, Skeleton, Spinner } from '../components/ui'
import { useApi, useDocumentTitle, type ApiQuery } from '../hooks/useApi'
import api from '../api/client'
import { getErrorMessage } from '../lib/errors'
import { formatDate, toApiDate } from '../lib/format'
import type { Acuerdo, CertificacionConOperador, EstadoAcuerdo, Pais } from '../lib/types'

type Tab = 'certificaciones' | 'acuerdos' | 'paises'
const TABS: Tab[] = ['certificaciones', 'acuerdos', 'paises']

export default function Admin() {
  useDocumentTitle('Administración')
  // La pestaña vive en la URL (?tab=acuerdos) para poder compartirla y volver con "atrás"
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get('tab') as Tab | null
  const tab: Tab = param && TABS.includes(param) ? param : 'certificaciones'
  const setTab = (t: Tab) => setSearchParams(t === 'certificaciones' ? {} : { tab: t }, { replace: true })

  const pendientes = useApi<CertificacionConOperador[]>('/admin/certificaciones-pendientes')
  const paises = useApi<Pais[]>('/admin/paises')

  const items: TabItem<Tab>[] = [
    { key: 'certificaciones', label: 'Certificaciones', icon: FileBadge2, count: pendientes.data?.length },
    { key: 'acuerdos', label: 'Acuerdos ARM', icon: Handshake },
    { key: 'paises', label: 'Países', icon: Globe2, count: paises.data?.length },
  ]

  return (
    <Layout>
      <PageHeader
        eyebrow="Administración"
        title="Gestión del portal"
        description="Aprobá solicitudes de certificación OEC y administrá los acuerdos y países habilitados."
      />
      <Tabs label="Secciones de administración" idPrefix="admin" items={items} value={tab} onChange={setTab} />
      <TabPanel key={tab} idPrefix="admin" tabKey={tab}>
        {tab === 'certificaciones' && <CertificacionesTab query={pendientes} />}
        {tab === 'acuerdos' && <AcuerdosTab paises={paises.data ?? []} />}
        {tab === 'paises' && <PaisesTab query={paises} />}
      </TabPanel>
    </Layout>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status">
      <span className="sr-only">Cargando…</span>
      {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </div>
  )
}

/* ----------------------------- Certificaciones ---------------------------- */

function CertificacionesTab({ query }: { query: ApiQuery<CertificacionConOperador[]> }) {
  const { data, loading, error, setData } = query

  if (loading && !data) return <ListSkeleton />
  if (error) return <Alert>{error}</Alert>
  if (!data?.length) {
    return (
      <div className="card">
        <EmptyState icon={CircleCheck} title="Sin solicitudes pendientes" description="Todas las certificaciones OEC fueron revisadas." />
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {data.map(cert => (
        <SolicitudRow
          key={cert.id}
          cert={cert}
          onResolved={id => setData(prev => prev?.filter(c => c.id !== id) ?? null)}
        />
      ))}
    </ul>
  )
}

function SolicitudRow({ cert, onResolved }: { cert: CertificacionConOperador; onResolved: (id: number) => void }) {
  const notify = useToast()
  const [pending, setPending] = useState<'aprobar' | 'rechazar' | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const ocupado = pending !== null

  const resolver = async (accion: 'aprobar' | 'rechazar') => {
    setPending(accion)
    try {
      await api.post(`/admin/certificaciones/${cert.id}/${accion}`)
      notify(`Certificación ${cert.numero_oec} ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}`)
      onResolved(cert.id)
    } catch (err) {
      notify(getErrorMessage(err, 'No se pudo procesar la solicitud'), 'error')
      setPending(null)
      setConfirmando(false)
    }
  }

  return (
    <li className="card flex animate-fade-up flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20 sm:flex">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-gold-300">{cert.numero_oec}</p>
          <p className="mt-0.5 truncate font-medium text-white">{cert.operador.razon_social}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>RUT <span className="font-mono text-slate-300">{cert.operador.rut}</span></span>
            <span className="flex items-center gap-1.5">
              <span className="code-chip">{cert.operador.pais.codigo_iso}</span>
              {cert.operador.pais.nombre}
            </span>
            {cert.fecha_vencimiento && (
              <span>Vencimiento propuesto: <span className="text-slate-300">{formatDate(cert.fecha_vencimiento)}</span></span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {confirmando ? (
          <>
            <span className="mr-1 text-xs text-slate-300">¿Rechazar esta solicitud?</span>
            <button type="button" className="btn-ghost" onClick={() => setConfirmando(false)} disabled={ocupado} autoFocus>
              Cancelar
            </button>
            <button type="button" className="btn-danger" onClick={() => resolver('rechazar')} disabled={ocupado}>
              {pending === 'rechazar' ? <Spinner /> : <X className="h-4 w-4" aria-hidden="true" />}
              Sí, rechazar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-danger" onClick={() => setConfirmando(true)} disabled={ocupado}>
              <X className="h-4 w-4" aria-hidden="true" />
              Rechazar
            </button>
            <button type="button" className="btn-primary" onClick={() => resolver('aprobar')} disabled={ocupado}>
              {pending === 'aprobar' ? <Spinner /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Aprobar
            </button>
          </>
        )}
      </div>
    </li>
  )
}

/* ------------------------------ Acuerdos ARM ------------------------------ */

function AcuerdosTab({ paises }: { paises: Pais[] }) {
  const notify = useToast()
  const acuerdos = useApi<Acuerdo[]>('/admin/acuerdos-arm')

  const cambiarEstado = async (a: Acuerdo, estado: EstadoAcuerdo, motivo: string | null) => {
    try {
      const res = await api.patch<Acuerdo>(`/admin/acuerdos-arm/${a.id}/estado`, { estado, motivo })
      acuerdos.setData(prev => prev?.map(x => (x.id === a.id ? res.data : x)) ?? null)
      notify(`Acuerdo ${a.pais_origen.codigo_iso}–${a.pais_destino.codigo_iso} ${estado === 'suspendido' ? 'suspendido' : 'reactivado'}`)
      return true
    } catch (err) {
      notify(getErrorMessage(err, 'No se pudo actualizar el acuerdo'), 'error')
      return false
    }
  }

  return (
    <div className="space-y-6">
      <NuevoAcuerdoForm paises={paises} onCreated={a => acuerdos.setData(prev => [...(prev ?? []), a])} />
      <section className="card" aria-labelledby="acuerdos-lista-titulo">
        <CardHeader
          id="acuerdos-lista-titulo"
          icon={Handshake}
          title="Acuerdos registrados"
          description="Un acuerdo suspendido deja de habilitar el reconocimiento mutuo entre los países."
        />
        {acuerdos.error ? (
          <Alert>{acuerdos.error}</Alert>
        ) : (
          <AcuerdosPanel acuerdos={acuerdos.data ?? []} loading={acuerdos.loading && !acuerdos.data} onCambiarEstado={cambiarEstado} />
        )}
      </section>
    </div>
  )
}

function NuevoAcuerdoForm({ paises, onCreated }: { paises: Pais[]; onCreated: (a: Acuerdo) => void }) {
  const notify = useToast()
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!origen || !destino) return setError('Seleccioná el país de origen y el de destino')
    if (origen === destino) return setError('El país de origen y el de destino deben ser distintos')
    setError('')
    setLoading(true)
    try {
      const res = await api.post<Acuerdo>('/admin/acuerdos-arm', {
        pais_origen_id: Number(origen),
        pais_destino_id: Number(destino),
        fecha_firma: toApiDate(fecha),
      })
      onCreated(res.data)
      notify(`Acuerdo ${res.data.pais_origen.codigo_iso}–${res.data.pais_destino.codigo_iso} creado`)
      setOrigen('')
      setDestino('')
      setFecha('')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el acuerdo'))
    } finally {
      setLoading(false)
    }
  }

  const opciones = paises.map(p => (
    <option key={p.id} value={p.id}>{p.nombre} ({p.codigo_iso})</option>
  ))

  return (
    <form onSubmit={submit} noValidate className="card" aria-labelledby="nuevo-acuerdo-titulo">
      <CardHeader
        id="nuevo-acuerdo-titulo"
        icon={Plus}
        title="Nuevo acuerdo"
        description="Registrá un Acuerdo de Reconocimiento Mutuo entre dos aduanas."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_11rem_auto] lg:items-start">
        <Field id="acuerdo-origen" label="País de origen">
          {a11y => (
            <select {...a11y} className="input-field" value={origen} onChange={e => setOrigen(e.target.value)}>
              <option value="">Seleccioná…</option>
              {opciones}
            </select>
          )}
        </Field>
        <Field id="acuerdo-destino" label="País de destino">
          {a11y => (
            <select {...a11y} className="input-field" value={destino} onChange={e => setDestino(e.target.value)}>
              <option value="">Seleccioná…</option>
              {opciones}
            </select>
          )}
        </Field>
        <Field id="acuerdo-fecha" label="Fecha de firma" optional>
          {a11y => <input {...a11y} type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} />}
        </Field>
        <button type="submit" disabled={loading} className="btn-primary h-[42px] lg:mt-[26px]">
          {loading ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Crear acuerdo
        </button>
      </div>
      {error && <Alert className="mt-4">{error}</Alert>}
    </form>
  )
}

/* --------------------------------- Países --------------------------------- */

function PaisesTab({ query }: { query: ApiQuery<Pais[]> }) {
  const notify = useToast()
  const [nombre, setNombre] = useState('')
  const [iso, setIso] = useState('')
  const [programa, setPrograma] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; iso?: string }>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!nombre.trim()) errs.nombre = 'Ingresá el nombre del país'
    if (!/^[A-Z]{2,3}$/.test(iso)) errs.iso = '2 o 3 letras'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setError('')
    setLoading(true)
    try {
      const res = await api.post<Pais>('/admin/paises', {
        nombre: nombre.trim(),
        codigo_iso: iso,
        programa_oea: programa.trim() || null,
      })
      query.setData(prev => [...(prev ?? []), res.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
      notify(`${res.data.nombre} agregado`)
      setNombre('')
      setIso('')
      setPrograma('')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agregar el país'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={crear} noValidate className="card" aria-labelledby="nuevo-pais-titulo">
        <CardHeader
          id="nuevo-pais-titulo"
          icon={Plus}
          title="Agregar país"
          description="Habilitá una nueva aduana para consultas y acuerdos."
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem] lg:grid-cols-[1fr_8rem_12rem_auto] lg:items-start">
          <Field id="pais-nombre" label="Nombre" error={fieldErrors.nombre}>
            {a11y => (
              <input
                {...a11y}
                className="input-field"
                placeholder="Chile"
                value={nombre}
                onChange={e => {
                  setNombre(e.target.value)
                  if (fieldErrors.nombre) setFieldErrors(p => ({ ...p, nombre: undefined }))
                }}
              />
            )}
          </Field>
          <Field id="pais-iso" label="Código ISO" error={fieldErrors.iso}>
            {a11y => (
              <input
                {...a11y}
                className="input-field font-mono uppercase"
                placeholder="CL"
                maxLength={3}
                autoComplete="off"
                value={iso}
                onChange={e => {
                  setIso(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
                  if (fieldErrors.iso) setFieldErrors(p => ({ ...p, iso: undefined }))
                }}
              />
            )}
          </Field>
          <Field id="pais-programa" label="Programa" optional>
            {a11y => (
              <input {...a11y} className="input-field" placeholder="OEA, AEO, C-TPAT" value={programa} onChange={e => setPrograma(e.target.value)} />
            )}
          </Field>
          <button type="submit" disabled={loading} className="btn-primary h-[42px] sm:col-span-2 lg:col-span-1 lg:mt-[26px]">
            {loading ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Agregar país
          </button>
        </div>
        {error && <Alert className="mt-4">{error}</Alert>}
      </form>

      <section className="card overflow-hidden p-0" aria-labelledby="paises-titulo">
        <div className="px-6 pt-6">
          <CardHeader
            id="paises-titulo"
            icon={Globe2}
            title="Países registrados"
            description={query.data ? `${query.data.length} ${query.data.length === 1 ? 'país habilitado' : 'países habilitados'}` : undefined}
          />
        </div>
        {query.loading && !query.data ? (
          <div className="space-y-2 px-6 pb-6">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : query.error ? (
          <div className="px-6 pb-6"><Alert>{query.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-navy-800 bg-navy-950/30 text-left">
                  <th scope="col" className="eyebrow px-6 py-2.5">País</th>
                  <th scope="col" className="eyebrow px-6 py-2.5">Código ISO</th>
                  <th scope="col" className="eyebrow px-6 py-2.5">Programa</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map(p => (
                  <tr key={p.id} className="border-b border-navy-800/60 transition-colors last:border-0 hover:bg-navy-800/30">
                    <td className="px-6 py-3 text-slate-100">{p.nombre}</td>
                    <td className="px-6 py-3"><span className="code-chip">{p.codigo_iso}</span></td>
                    <td className="px-6 py-3 text-slate-300">{p.programa_oea ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
