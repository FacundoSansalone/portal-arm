import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import { getErrorMessage } from '../lib/errors'

type Params = Record<string, string | number | undefined>

export interface ApiQuery<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

// GET con cancelación: si cambian url/params o se desmonta el componente, la respuesta
// vieja se descarta y no pisa a la nueva. `url = null` deja la consulta deshabilitada.
export function useApi<T>(url: string | null, params?: Params): ApiQuery<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(url !== null)
  const [nonce, setNonce] = useState(0)
  const paramsKey = JSON.stringify(params ?? {})

  useEffect(() => {
    if (url === null) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api.get<T>(url, { params: JSON.parse(paramsKey), signal: controller.signal })
      .then(res => setData(res.data))
      .catch(err => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'No se pudo cargar la información'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [url, paramsKey, nonce])

  const reload = useCallback(() => setNonce(n => n + 1), [])

  return { data, error, loading, reload, setData }
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Portal ARM`
  }, [title])
}
