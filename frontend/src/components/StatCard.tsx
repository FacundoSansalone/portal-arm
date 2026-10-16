import type { LucideIcon } from 'lucide-react'

type Accent = 'gold' | 'emerald' | 'amber' | 'red' | 'slate'

const ACCENTS: Record<Accent, string> = {
  gold: 'bg-gold-500/10 text-gold-400 ring-gold-500/20',
  emerald: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  red: 'bg-red-400/10 text-red-300 ring-red-400/20',
  slate: 'bg-navy-800 text-slate-300 ring-navy-700',
}

interface StatCardProps {
  label: string
  value: number | string | null | undefined
  icon: LucideIcon
  accent?: Accent
  hint?: string
  loading?: boolean
}

export default function StatCard({ label, value, icon: Icon, accent = 'gold', hint, loading }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${ACCENTS[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-16" aria-hidden="true" />
      ) : (
        <p className="font-display text-3xl font-semibold leading-none tabular-nums text-white">{value ?? '—'}</p>
      )}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
