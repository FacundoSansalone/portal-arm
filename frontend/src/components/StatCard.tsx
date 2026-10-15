import React from 'react'

interface StatCardProps {
  label: string
  value: number | string
  icon?: string
  accent?: 'gold' | 'emerald' | 'amber' | 'slate'
}

const ACCENTS: Record<string, string> = {
  gold: 'text-gold-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  slate: 'text-slate-300',
}

export default function StatCard({ label, value, icon, accent = 'gold' }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      {icon && (
        <div className="w-11 h-11 rounded-lg bg-navy-800 flex items-center justify-center text-xl flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <p className={`font-display text-2xl font-bold ${ACCENTS[accent]}`}>{value}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  )
}
