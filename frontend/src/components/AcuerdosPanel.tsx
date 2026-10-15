import React from 'react'

interface Pais {
  id: number
  nombre: string
  codigo_iso: string
  programa_oea: string | null
}

export interface Acuerdo {
  id: number
  estado: 'activo' | 'suspendido'
  fecha_firma: string | null
  motivo_estado: string | null
  pais_origen: Pais
  pais_destino: Pais
}

interface AcuerdosPanelProps {
  acuerdos: Acuerdo[]
  loading?: boolean
  emptyText?: string
  onCambiarEstado?: (acuerdo: Acuerdo, nuevoEstado: 'activo' | 'suspendido') => void
}

export default function AcuerdosPanel({ acuerdos, loading, emptyText, onCambiarEstado }: AcuerdosPanelProps) {
  if (loading) {
    return <p className="text-slate-500 text-sm">Cargando acuerdos...</p>
  }

  if (acuerdos.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        {emptyText || 'Todavía no hay Acuerdos de Reconocimiento Mutuo registrados.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-navy-800">
            <th className="px-2 py-2 font-medium">País origen</th>
            <th className="px-2 py-2 font-medium">País destino</th>
            <th className="px-2 py-2 font-medium">Firma</th>
            <th className="px-2 py-2 font-medium">Estado</th>
            {onCambiarEstado && <th className="px-2 py-2 font-medium text-right">Acción</th>}
          </tr>
        </thead>
        <tbody>
          {acuerdos.map(a => (
            <tr key={a.id} className="border-b border-navy-800/60 last:border-0">
              <td className="px-2 py-2.5 text-slate-200">
                {a.pais_origen.nombre}
                <span className="text-slate-500 ml-1.5 font-mono text-xs">{a.pais_origen.codigo_iso}</span>
              </td>
              <td className="px-2 py-2.5 text-slate-200">
                {a.pais_destino.nombre}
                <span className="text-slate-500 ml-1.5 font-mono text-xs">{a.pais_destino.codigo_iso}</span>
              </td>
              <td className="px-2 py-2.5 text-slate-400">
                {a.fecha_firma ? new Date(a.fecha_firma).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td className="px-2 py-2.5">
                <span className={`badge ${a.estado === 'activo'
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                  : 'bg-red-900/50 text-red-300 border border-red-700/50'}`}>
                  {a.estado === 'activo' ? 'Activo' : 'Suspendido'}
                </span>
              </td>
              {onCambiarEstado && (
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => onCambiarEstado(a, a.estado === 'activo' ? 'suspendido' : 'activo')}
                    className="text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    {a.estado === 'activo' ? 'Suspender' : 'Reactivar'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
