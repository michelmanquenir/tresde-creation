import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as auth from '../auth/authService'
import type { Session } from '../auth/authService'
import { AUTH_EXPIRED_EVENT } from '../api/client'

type AuthValue = {
  session: Session | null
  login: (username: string, password: string, remember: boolean) => Promise<Session>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)
const DAY = 24 * 60 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(auth.getStoredSession)

  // Si el backend rechaza el token (401), se cierra la sesión y las páginas protegidas mandan al login
  useEffect(() => {
    const onExpired = () => {
      auth.logout()
      setSession(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  // Renueva el token al abrir la tienda si ya pasó un día desde que se emitió: mientras entres al menos una vez
  // cada 30 días, la sesión no se cierra.
  const token = session?.token
  useEffect(() => {
    const current = auth.getStoredSession()
    if (!current) return
    let cancelled = false
    auth
      .refreshIfNeeded(current)
      .then((renewed) => {
        if (renewed && !cancelled) setSession(renewed)
      })
      .catch(() => {
        /* sin conexión o servidor dormido: se sigue usando el token actual */
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // Cierra la sesión automáticamente cuando expira.
  // setTimeout no admite más de ~24,8 días, así que se revisa como máximo una vez al día.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!session) return
    const remaining = session.expiresAt - Date.now()
    const timer = setTimeout(() => {
      if (Date.now() >= session.expiresAt) {
        auth.logout()
        setSession(null)
      } else {
        setTick((t) => t + 1)
      }
    }, Math.max(0, Math.min(remaining, DAY)))
    return () => clearTimeout(timer)
  }, [session, tick])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      login: async (username, password, remember) => {
        const s = await auth.login(username, password, remember)
        setSession(s)
        return s
      },
      logout: () => {
        auth.logout()
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
