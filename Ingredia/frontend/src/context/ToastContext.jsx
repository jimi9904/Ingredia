import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { registerToast } from '../api/axios'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, duration = 2800) => {
    setToast({ id: Date.now(), message })
    setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => { registerToast(show) }, [show])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full bg-ink/95 text-white text-sm font-medium shadow-card-hover backdrop-blur fade-in-up"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext) || (() => {})
}
