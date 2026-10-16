import {
  Ban, CalendarX2, CircleCheck, CirclePause, CircleX, Clock3, TriangleAlert, type LucideIcon,
} from 'lucide-react'
import type { EstadoAcuerdo, EstadoCertificacion, ResultadoValidacion, Rol } from './types'

export type Tone = 'success' | 'warning' | 'caution' | 'danger' | 'neutral'

export interface StatusMeta {
  label: string
  tone: Tone
  icon: LucideIcon
}

export const TONE_BADGE: Record<Tone, string> = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  caution: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  neutral: 'border-navy-600 bg-navy-800 text-slate-300',
}

export const TONE_TEXT: Record<Tone, string> = {
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  caution: 'text-orange-300',
  danger: 'text-red-300',
  neutral: 'text-slate-300',
}

export const TONE_SURFACE: Record<Tone, string> = {
  success: 'border-emerald-400/25 bg-emerald-400/[0.05]',
  warning: 'border-amber-400/25 bg-amber-400/[0.05]',
  caution: 'border-orange-400/25 bg-orange-400/[0.05]',
  danger: 'border-red-400/25 bg-red-400/[0.05]',
  neutral: 'border-navy-700 bg-navy-900',
}

export const RESULTADO_META: Record<ResultadoValidacion, StatusMeta & { description: string }> = {
  APROBADA: {
    label: 'Aprobada',
    tone: 'success',
    icon: CircleCheck,
    description: 'El operador tiene certificación OEC vigente y existe un Acuerdo ARM activo entre los países.',
  },
  SIN_ACUERDO: {
    label: 'Sin acuerdo',
    tone: 'warning',
    icon: TriangleAlert,
    description: 'No existe un Acuerdo de Reconocimiento Mutuo activo entre los países.',
  },
  CERTIFICACION_VENCIDA: {
    label: 'Vencida',
    tone: 'caution',
    icon: CalendarX2,
    description: 'La certificación OEC del operador está vencida.',
  },
  RECHAZADA: {
    label: 'Rechazada',
    tone: 'danger',
    icon: CircleX,
    description: 'La certificación no está vigente o el operador no fue encontrado.',
  },
}

export const CERT_META: Record<EstadoCertificacion, StatusMeta> = {
  vigente: { label: 'Vigente', tone: 'success', icon: CircleCheck },
  en_proceso: { label: 'En proceso', tone: 'warning', icon: Clock3 },
  vencida: { label: 'Vencida', tone: 'danger', icon: CalendarX2 },
  rechazada: { label: 'Rechazada', tone: 'neutral', icon: Ban },
}

export const ACUERDO_META: Record<EstadoAcuerdo, StatusMeta> = {
  activo: { label: 'Activo', tone: 'success', icon: CircleCheck },
  suspendido: { label: 'Suspendido', tone: 'danger', icon: CirclePause },
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  aduana: 'Aduana',
}
