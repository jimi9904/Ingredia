import axios from 'axios'

export const TOKEN_KEY = 'ingredia_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let toastFn = null
export const registerToast = (fn) => { toastFn = fn }

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      setToken(null)
      try { localStorage.removeItem('ingredia_user') } catch {}
      const path = window.location.pathname
      if (!['/', '/login', '/signup', '/forgot-password', '/reset-password'].includes(path)) {
        window.location.href = `/login?returnTo=${encodeURIComponent(path)}`
      }
    } else if (status === 422) {
      const err = new Error(error.response.data?.message || 'Validation failed')
      err.errors = error.response.data?.errors || {}
      err.status = 422
      return Promise.reject(err)
    } else if (status === 429) {
      toastFn?.('Too many attempts, please wait a moment.')
    } else if (status >= 500) {
      toastFn?.('Server error — please try again.')
    }
    return Promise.reject(error)
  }
)

export default api
