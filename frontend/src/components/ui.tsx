import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, LoaderCircle, type LucideIcon } from 'lucide-react'
import { TONE_BADGE, type StatusMeta } from '../lib/status'

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />
}

// Sello con tilde: identidad del portal (validación / certificación)
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-gold-500" />
      <circle cx="16" cy="16" r="10" fill="none" className="stroke-navy-950" strokeWidth="1.5" strokeDasharray="2.2 1.6" />
      <path d="M11.6 16.3l3 3 5.8-6.2" fill="none" className="stroke-navy-950" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-gold-400">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  id?: string
}

export function CardHeader({ title, description, icon: Icon, action, id }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-gold-400" aria-hidden="true" />}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

type AlertTone = 'error' | 'success' | 'info'

const ALERT_STYLES: Record<AlertTone, string> = {
  error: 'border-red-400/30 bg-red-400/10 text-red-200',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  info: 'border-navy-600 bg-navy-800/60 text-slate-300',
}

const ALERT_ICON: Record<AlertTone, LucideIcon> = { error: CircleAlert, success: CircleCheck, info: Info }

export function Alert({ tone = 'error', children, className = '' }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  const Icon = ALERT_ICON[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${ALERT_STYLES[tone]} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-8' : 'py-14'}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-navy-700 bg-navy-800/70 text-slate-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function StatusBadge({ meta, className = '' }: { meta: StatusMeta; className?: string }) {
  const Icon = meta.icon
  return (
    <span className={`badge ${TONE_BADGE[meta.tone]} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

interface FieldA11y {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FieldProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  children: (a11y: FieldA11y) => ReactNode
}

// Conecta label, ayuda y error con el control (htmlFor / aria-describedby / aria-invalid)
export function Field({ id, label, hint, error, optional, children }: FieldProps) {
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-slate-400">(opcional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': errorId ?? hintId })}
      {hintId && <p id={hintId} className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {errorId && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-red-300">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
