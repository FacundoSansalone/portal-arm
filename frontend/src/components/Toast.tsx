import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'

type ToastTone = 'success' | 'error'
type Notify = (message: string, tone?: ToastTone) => void

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

const ToastContext = createContext<Notify>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const notify = useCallback<Notify>((message, tone = 'success') => {
    const id = ++nextId.current
    setToasts(ts => [...ts.slice(-2), { id, tone, message }])
    window.setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {/* Región viva estable: los lectores de pantalla anuncian cada aviso nuevo */}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map(t => {
          const Icon = t.tone === 'success' ? CircleCheck : CircleAlert
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl border border-navy-700 bg-navy-900/95 py-3 pl-4 pr-2 text-sm text-slate-100 shadow-pop backdrop-blur"
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${t.tone === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 pt-px">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
