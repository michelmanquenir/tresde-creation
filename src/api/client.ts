// Cliente HTTP para el backend (Spring Boot).
// En desarrollo, Vite redirige /api a http://localhost:8080 (ver vite.config.ts).
// En producción, define VITE_API_URL con la URL del backend (ej. https://api.mitienda.com).

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const TOKEN_KEY = 'tresd-session'

/** Error devuelto por la API, con el mensaje listo para mostrar y los errores por campo. */
export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Evento que se dispara cuando el backend rechaza el token (sesión vencida o inválida). */
export const AUTH_EXPIRED_EVENT = 'tresd:auth-expired'

function currentToken(): string | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(TOKEN_KEY)
      if (raw) return (JSON.parse(raw) as { token?: string }).token ?? null
    } catch {
      /* sin acceso */
    }
  }
  return null
}

type RequestOptions = {
  method?: string
  body?: unknown // se envía como JSON (o tal cual si es FormData)
  auth?: boolean // adjunta el token de la sesión (admin o cliente)
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = 'GET', body, auth = false, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = currentToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (res.status === 204) return undefined as T

  // Si la respuesta no es JSON, no llegó al backend (ej. Vercel devolvió index.html
  // porque VITE_API_URL no está configurada o el backend no está publicado).
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!isJson) {
    console.error(`La API respondió sin JSON en ${API_URL + path}. Revisa VITE_API_URL.`)
    throw new ApiError(res.status, 'No se pudo conectar con el servidor de la tienda. Inténtalo más tarde.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && auth) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError(
      res.status,
      data?.message ?? `Error del servidor (${res.status}).`,
      data?.errors ?? {},
    )
  }
  return data as T
}
