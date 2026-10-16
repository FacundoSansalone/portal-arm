import { Fragment, useState } from 'react'
import { ArrowLeftRight, Handshake } from 'lucide-react'
import type { Acuerdo, EstadoAcuerdo, Pais } from '../lib/types'
import { ACUERDO_META } from '../lib/status'
import { formatDate } from '../lib/format'
import { EmptyState, Skeleton, Spinner, StatusBadge } from './ui'

interface AcuerdosPanelProps {
  acuerdos: Acuerdo[]
  loading?: boolean
  emptyText?: string
  /** Devuelve true si el cambio se aplicó, para cerrar el formulario de motivo */
  onCambiarEstado?: (acuerdo: Acuerdo, nuevoEstado: EstadoAcuerdo, motivo: string | null) => Promise<boolean>
  /** Lista compacta (sin columnas ni acciones) para paneles angostos */
  compact?: boolean
}

export default function AcuerdosPanel({ acuerdos, loading, emptyText, onCambiarEstado, compact }: AcuerdosPanelProps) {
  const [suspendiendoId, setSuspendiendoId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    )
  }

  if (acuerdos.length === 0) {
    return (
      <EmptyState
        compact
        icon={Handshake}
        title="Sin acuerdos"
        description={emptyText ?? 'Todavía no hay Acuerdos de Reconocimiento Mutuo registrados.'}
      />
    )
  }

  if (compact) {
    return (
      <ul className="divide-y divide-navy-800/70">
        {acuerdos.map(a => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <Ruta acuerdo={a} />
            <StatusBadge meta={ACUERDO_META[a.estado]} />
          </li>
        ))}
      </ul>
    )
  }

  const cambiar = async (a: Acuerdo, estado: EstadoAcuerdo, motivoTexto: string | null) => {
    if (!onCambiarEstado) return
    setPendingId(a.id)
    const ok = await onCambiarEstado(a, estado, motivoTexto)
    setPendingId(null)
    if (ok) {
      setSuspendiendoId(null)
      setMotivo('')
    }
  }

  const columnas = onCambiarEstado ? 4 : 3

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <caption className="sr-only">Acuerdos de Reconocimiento Mutuo</caption>
        <thead>
          <tr className="border-b border-navy-800 text-left">
            <th scope="col" className="eyebrow px-3 py-2.5">Acuerdo</th>
            <th scope="col" className="eyebrow px-3 py-2.5">Firma</th>
            <th scope="col" className="eyebrow px-3 py-2.5">Estado</th>
            {onCambiarEstado && <th scope="col" className="eyebrow px-3 py-2.5 text-right">Acción</th>}
          </tr>
        </thead>
        <tbody>
          {acuerdos.map(a => {
            const pending = pendingId === a.id
            const abierto = suspendiendoId === a.id
            return (
              <Fragment key={a.id}>
                <tr className={`transition-colors hover:bg-navy-800/30 ${abierto ? 'bg-navy-800/30' : 'border-b border-navy-800/60 last:border-0'}`}>
                  <td className="px-3 py-3"><Ruta acuerdo={a} /></td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-400">{formatDate(a.fecha_firma)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge meta={ACUERDO_META[a.estado]} />
                    {a.estado === 'suspendido' && a.motivo_estado && (
                      <p className="mt-1 max-w-[18rem] text-xs text-slate-400">{a.motivo_estado}</p>
                    )}
                  </td>
                  {onCambiarEstado && (
                    <td className="px-3 py-3 text-right">
                      {a.estado === 'activo' ? (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          aria-expanded={abierto}
                          aria-controls={`suspender-${a.id}`}
                          disabled={pending}
                          onClick={() => { setSuspendiendoId(abierto ? null : a.id); setMotivo('') }}
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-gold-300"
                          disabled={pending}
                          onClick={() => cambiar(a, 'activo', null)}
                        >
                          {pending && <Spinner className="h-3.5 w-3.5" />}
                          Reactivar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {abierto && (
                  <tr id={`suspender-${a.id}`} className="border-b border-navy-800/60 bg-navy-800/30">
                    <td colSpan={columnas} className="px-3 pb-4 pt-1">
                      <form
                        className="flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-end"
                        onSubmit={e => { e.preventDefault(); cambiar(a, 'suspendido', motivo.trim() || null) }}
                      >
                        <div className="flex-1">
                          <label htmlFor={`motivo-${a.id}`} className="field-label text-xs">
                            Motivo de la suspensión <span className="font-normal text-slate-400">(opcional)</span>
                          </label>
                          <input
                            id={`motivo-${a.id}`}
                            className="input-field"
                            placeholder="Ej: revisión del acuerdo bilateral"
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-ghost btn-sm h-10" onClick={() => setSuspendiendoId(null)}>
                            Cancelar
                          </button>
                          <button type="submit" className="btn-danger btn-sm h-10" disabled={pending}>
                            {pending && <Spinner className="h-3.5 w-3.5" />}
                            Confirmar suspensión
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Ruta({ acuerdo }: { acuerdo: Acuerdo }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PaisChip pais={acuerdo.pais_origen} />
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-gold-500" aria-hidden="true" />
      <span className="sr-only">y</span>
      <PaisChip pais={acuerdo.pais_destino} />
    </span>
  )
}

function PaisChip({ pais }: { pais: Pais }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="code-chip">{pais.codigo_iso}</span>
      <span className="truncate text-slate-200">{pais.nombre}</span>
    </span>
  )
}
