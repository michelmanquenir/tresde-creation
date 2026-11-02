// Autenticación contra el backend: POST /api/auth/login devuelve un token JWT.
// El token se guarda en el navegador y se envía en cada petición del panel.

import { api } from '../api/client'

export type Session = {
  username: string
  name: string
  token: string
  expiresAt: number // epoch ms
}

type LoginResponse = {
  token: string
  expiresAt: string // ISO
  user: { username: string; name: string }
}

const STORAGE_KEY = 'tresd-session'

const stores = (): Storage[] => {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

export async function login(username: string, password: string, remember: boolean): Promise<Session> {
  const res = await api<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username: username.trim(), password },
  })
  const session: Session = {
    username: res.user.username,
    name: res.user.name,
    token: res.token,
    expiresAt: new Date(res.expiresAt).getTime(),
  }
  logout() // limpia una sesión anterior guardada en el otro almacenamiento
  try {
    // "Mantener sesión" la guarda aunque cierres el navegador; si no, dura hasta cerrar la pestaña.
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria */
  }
  return session
}

export function logout() {
  for (const s of stores()) {
    try {
      s.removeItem(STORAGE_KEY)
    } catch {
      /* ignorar */
    }
  }
}

export function getStoredSession(): Session | null {
  for (const s of stores()) {
    try {
      const raw = s.getItem(STORAGE_KEY)
      if (!raw) continue
      const session = JSON.parse(raw) as Session
      if (session.token && session.expiresAt > Date.now()) return session
      s.removeItem(STORAGE_KEY) // expirada o de la versión anterior (sin token)
    } catch {
      /* datos corruptos o sin acceso */
    }
  }
  return null
}
