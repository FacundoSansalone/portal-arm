import { History } from 'lucide-react'
import type { Validacion } from '../lib/types'
import { RESULTADO_META } from '../lib/status'
import { formatDateTime, parseApiDate, timeAgo } from '../lib/format'
import { EmptyState, Skeleton, StatusBadge } from './ui'

interface ValidacionesTableProps {
  items: Validacion[] | undefined
  loading: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export default function ValidacionesTable({
  items, loading, emptyTitle = 'Sin consultas todavía', emptyDescription,
}: ValidacionesTableProps) {
  if (loading && !items) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <EmptyState compact icon={History} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="-mx-2 overflow-x-auto">
      <table className={`w-full min-w-[520px] text-sm transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <thead>
          <tr className="border-b border-navy-800 text-left">
            <th scope="col" className="eyebrow px-2 py-2.5">Consulta</th>
            <th scope="col" className="eyebrow px-2 py-2.5">OEC</th>
            <th scope="col" className="eyebrow px-2 py-2.5">País</th>
            <th scope="col" className="eyebrow px-2 py-2.5 text-right">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {items.map(v => (
            <tr key={v.id} className="border-b border-navy-800/60 transition-colors last:border-0 hover:bg-navy-800/30">
              <td className="whitespace-nowrap px-2 py-3">
                <time
                  dateTime={parseApiDate(v.created_at).toISOString()}
                  title={formatDateTime(v.created_at)}
                  className="block text-slate-200"
                >
                  {timeAgo(v.created_at)}
                </time>
                <span className="font-mono text-[11px] text-slate-400">#{v.id}</span>
              </td>
              <td className="px-2 py-3 font-mono text-[13px] text-slate-100">{v.numero_oec_consultado ?? '—'}</td>
              <td className="px-2 py-3">
                {v.pais_solicitante ? <span className="code-chip">{v.pais_solicitante}</span> : '—'}
              </td>
              <td className="px-2 py-3 text-right">
                <StatusBadge meta={RESULTADO_META[v.resultado]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
