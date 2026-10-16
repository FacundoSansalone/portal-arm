const DATE = new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('es-UY', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800],
  ['day', 86_400], ['hour', 3_600], ['minute', 60],
]

// El backend guarda datetimes naive en UTC (datetime.utcnow) y los serializa sin zona horaria:
// sin esto el navegador los interpreta como hora local y quedan corridos.
export function parseApiDate(value: string): Date {
  const needsZone = value.includes('T') && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)
  return new Date(needsZone ? `${value}Z` : value)
}

// El backend persiste en columnas sin zona horaria: se envía la fecha naive para no mezclar
// datetimes con y sin tz en asyncpg.
export function toApiDate(dateInput: string): string | null {
  return dateInput ? `${dateInput}T00:00:00` : null
}

export function formatDate(value?: string | null): string {
  return value ? DATE.format(parseApiDate(value)) : '—'
}

export function formatDateTime(value?: string | null): string {
  return value ? DATE_TIME.format(parseApiDate(value)) : '—'
}

export function timeAgo(value: string, now = Date.now()): string {
  const seconds = (parseApiDate(value).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit)
  }
  return 'recién'
}

export function daysUntil(value: string, now = Date.now()): number {
  return Math.ceil((parseApiDate(value).getTime() - now) / 86_400_000)
}

export function initials(email: string): string {
  return email.split('@')[0].replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '··'
}
