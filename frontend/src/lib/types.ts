// Tipos de la API (espejo de app/schemas.py)

export type Rol = 'admin' | 'operador' | 'aduana'

export interface Pais {
  id: number
  nombre: string
  codigo_iso: string
  programa_oea: string | null
}

export interface Operador {
  id: number
  razon_social: string
  rut: string
  contacto_email: string | null
  pais: Pais
}

export type EstadoCertificacion = 'en_proceso' | 'vigente' | 'vencida' | 'rechazada'

export interface Certificacion {
  id: number
  numero_oec: string
  estado: EstadoCertificacion
  fecha_emision: string | null
  fecha_vencimiento: string | null
}

export interface CertificacionConOperador extends Certificacion {
  operador: Operador
}

export interface DashboardOperador {
  operador: Operador | null
  certificacion: Certificacion | null
}

export type EstadoAcuerdo = 'activo' | 'suspendido'

export interface Acuerdo {
  id: number
  estado: EstadoAcuerdo
  fecha_firma: string | null
  motivo_estado: string | null
  pais_origen: Pais
  pais_destino: Pais
}

export type ResultadoValidacion = 'APROBADA' | 'SIN_ACUERDO' | 'CERTIFICACION_VENCIDA' | 'RECHAZADA'

export interface Validacion {
  id: number
  resultado: ResultadoValidacion
  detalle: string | null
  beneficios: string | null
  numero_oec_consultado: string | null
  pais_solicitante: string | null
  created_at: string
}

export interface ValidacionList {
  total: number
  items: Validacion[]
}
