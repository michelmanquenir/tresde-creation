import type { Role } from '../auth/authService'
import { api } from './client'

/** Usuario del panel (lo crea el administrador). */
export type PanelUser = {
  id: number
  username: string
  name: string
  role: Role
  createdAt: string // ISO
}

/** password: obligatoria al crear; al editar, vacía = no se cambia. username solo se usa al crear. */
export type UserInput = { name: string; username?: string; password?: string; role: 'ADMIN' | 'STAFF' | 'SELLER' }

export const usersApi = {
  list: () => api<PanelUser[]>('/api/admin/users', { auth: true }),
  create: (input: UserInput) => api<PanelUser>('/api/admin/users', { method: 'POST', body: input, auth: true }),
  update: (id: number, input: UserInput) => api<PanelUser>(`/api/admin/users/${id}`, { method: 'PUT', body: input, auth: true }),
  remove: (id: number) => api<void>(`/api/admin/users/${id}`, { method: 'DELETE', auth: true }),
}
