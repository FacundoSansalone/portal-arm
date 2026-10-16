import { isAxiosError } from 'axios'

// Normaliza los errores de FastAPI: `detail` puede ser un string o la lista de errores de Pydantic.
export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (isAxiosError(err)) {
    const detail: unknown = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: { msg?: string }) => d?.msg ?? JSON.stringify(d)).join('; ')
    }
    if (!err.response) return 'No se pudo conectar con el servidor'
  }
  return fallback
}
