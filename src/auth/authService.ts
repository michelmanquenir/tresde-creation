// Autenticación contra el backend: POST /api/auth/login y /api/auth/register devuelven un token JWT.
// El token se guarda en el navegador y se envía en las peticiones que lo requieren.
// La misma sesión sirve para el administrador (role ADMIN) y para los clientes (role CUSTOMER).

import { api } from '../api/client'

export type Role = 'ADMIN' | 'CUSTOMER'

export type Session = {
  username: string // en los clientes es su correo
  name: string
  role: Role
  token: string
  expiresAt: number // epoch ms
}

type LoginResponse = {
  token: string
  expiresAt: string // ISO
  user: { username: string; name: string; role: Role }
}

const STORAGE_KEY = 'tresd-session'

const stores = (): Storage[] => {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

export function login(username: string, password: string, remember: boolean): Promise<Session> {
  return startSession(
    api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
    }),
    remember,
  )
}

/** Crea una cuenta de cliente y deja la sesión iniciada. */
export function register(name: string, email: string, password: string, remember: boolean): Promise<Session> {
  return startSession(
    api<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: { name: name.trim(), email: email.trim(), password },
    }),
    remember,
  )
}

async function startSession(request: Promise<LoginResponse>, remember: boolean): Promise<Session> {
  const res = await request
  const session: Session = {
    username: res.user.username,
    name: res.user.name,
    role: res.user.role,
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
      if (session.token && session.role && session.expiresAt > Date.now()) return session
      s.removeItem(STORAGE_KEY) // expirada o de una versión anterior (sin token o sin rol)
    } catch {
      /* datos corruptos o sin acceso */
    }
  }
  return null
}
