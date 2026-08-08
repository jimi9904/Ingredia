import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authApi from '../api/authApi'
import { getToken, setToken } from '../api/axios'

const USER_KEY = 'ingredia_user'

const readCachedUser = () => {
  try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
const writeCachedUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  } catch {}
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Initialise synchronously from cache so the correct user shows instantly on refresh
  const [user, setUser] = useState(() => {
    if (!getToken()) return null   // no token → not logged in
    return readCachedUser()        // token present → use cached user until API confirms
  })
  // No loading flash when we already have a cached user
  const [loading, setLoading] = useState(() => {
    const hasToken = !!getToken()
    const hasCached = !!readCachedUser()
    return hasToken && !hasCached  // still need to wait only if token but no cache yet
  })

  // Keep localStorage in sync whenever user changes
  useEffect(() => { writeCachedUser(user) }, [user])

  // Silently verify + refresh user data from the server on every mount
  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) {
      writeCachedUser(null)
      setUser(null)
      setLoading(false)
      return
    }
    authApi.me()
      .then((u) => {
        if (!cancelled) {
          setUser(u)        // update with fresh server data
          writeCachedUser(u)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          writeCachedUser(null)
          setUser(null)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials)
    setToken(data.token)
    writeCachedUser(data.user)  // persist immediately so refresh shows correct user
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload)
    setToken(data.token)
    writeCachedUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setToken(null)
    writeCachedUser(null)  // clear cache on logout
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updates } : prev
      writeCachedUser(next)
      return next
    })
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
