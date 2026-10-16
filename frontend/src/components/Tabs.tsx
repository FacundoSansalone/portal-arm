import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface TabItem<K extends string> {
  key: K
  label: string
  icon?: LucideIcon
  count?: number
}

interface TabsProps<K extends string> {
  items: TabItem<K>[]
  value: K
  onChange: (key: K) => void
  idPrefix: string
  label: string
}

// Patrón WAI-ARIA de pestañas: flechas / Home / End mueven el foco y la selección
export function Tabs<K extends string>({ items, value, onChange, idPrefix, label }: TabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].key)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-navy-800">
      {items.map((item, index) => {
        const selected = item.key === value
        const Icon = item.icon
        return (
          <button
            key={item.key}
            ref={el => { refs.current[index] = el }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={e => handleKeyDown(e, index)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              selected
                ? 'border-gold-500 text-white'
                : 'border-transparent text-slate-400 hover:border-navy-600 hover:text-slate-200'
            }`}
          >
            {Icon && <Icon className={`h-4 w-4 ${selected ? 'text-gold-400' : ''}`} aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && (
              <span
                className={`min-w-[1.5rem] rounded-full px-1.5 py-px text-center text-xs tabular-nums ${
                  selected ? 'bg-gold-500/15 text-gold-300' : 'bg-navy-800 text-slate-400'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idPrefix, tabKey, children }: { idPrefix: string; tabKey: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      tabIndex={0}
      className="animate-fade-up focus:outline-none"
    >
      {children}
    </div>
  )
}
