import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as auth from '../auth/authService'
import type { Session } from '../auth/authService'

type AuthValue = {
  session: Session | null
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(auth.getStoredSession)

  // Cierra la sesión automáticamente cuando expira
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => {
      auth.logout()
      setSession(null)
    }, Math.max(0, session.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [session])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      login: async (username, password, remember) => {
        setSession(await auth.login(username, password, remember))
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
