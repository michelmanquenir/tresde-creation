// Servicio de autenticación.
// HOY ES UN MOCK: valida admin/admin en el navegador. Esto NO es seguro en producción,
// porque cualquiera puede leer este código. Cuando tengas backend, reemplaza login()
// por una llamada a tu API que devuelva un token, y valida ese token en el servidor.

export type Session = {
  username: string
  name: string
  token: string
  expiresAt: number // epoch ms
}

const STORAGE_KEY = 'tresd-session'
const SESSION_HOURS = 8

const MOCK_USERS = [{ username: 'admin', password: 'admin', name: 'Administrador' }]

const stores = (): Storage[] => {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

export async function login(username: string, password: string, remember: boolean): Promise<Session> {
  await new Promise((r) => setTimeout(r, 400)) // simula la latencia de una API

  const user = MOCK_USERS.find((u) => u.username === username.trim().toLowerCase() && u.password === password)
  if (!user) throw new Error('Usuario o contraseña incorrectos.')

  const session: Session = {
    username: user.username,
    name: user.name,
    token: crypto.randomUUID(),
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  }
  try {
    // "Recordarme" guarda la sesión aunque cierres el navegador; si no, dura hasta cerrar la pestaña.
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
      if (session.expiresAt > Date.now()) return session
      s.removeItem(STORAGE_KEY) // expirada
    } catch {
      /* datos corruptos o sin acceso */
    }
  }
  return null
}
