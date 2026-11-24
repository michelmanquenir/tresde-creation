import type { Role } from '../auth/authService'
import { api } from './client'

/**
 * Entrega de inventario entre usuarios del panel (ej. "Michel entregó 10 llaveros a Pedro").
 * El stock recién se suma cuando quien recibe la acepta.
 */
export type DeliveryStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export type DeliveryItem = {
  productId?: string // no viene si el producto se eliminó
  productName: string
  quantity: number
}

export type DeliveryComment = {
  id: number
  authorUsername: string
  authorName: string
  body: string
  createdAt: string // ISO
}

export type Delivery = {
  id: number
  senderUsername: string
  senderName: string
  recipientUsername: string
  recipientName: string
  status: DeliveryStatus
  note?: string
  totalUnits: number
  items: DeliveryItem[]
  comments: DeliveryComment[]
  deliveredAt: string // ISO
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
}

export type DeliveryInput = {
  recipientUsername: string
  deliveredAt?: string // ISO
  note?: string
  items: { productId: string; quantity: number }[]
}

export type Recipient = { username: string; name: string; role: Role }

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
}

/** Se dispara al aceptar/rechazar/crear para que el menú actualice el aviso de pendientes. */
export const DELIVERIES_CHANGED_EVENT = 'tresd:deliveries-changed'
export const notifyDeliveriesChanged = () => window.dispatchEvent(new Event(DELIVERIES_CHANGED_EVENT))

const action = (id: number, name: 'accept' | 'reject' | 'cancel', comment?: string) =>
  api<Delivery>(`/api/admin/deliveries/${id}/${name}`, { method: 'POST', body: { comment }, auth: true })

export const deliveriesApi = {
  list: (status?: DeliveryStatus) =>
    api<Delivery[]>(`/api/admin/deliveries${status ? `?status=${status}` : ''}`, { auth: true }),
  pendingCount: () => api<{ count: number }>('/api/admin/deliveries/pending-count', { auth: true }),
  recipients: () => api<Recipient[]>('/api/admin/deliveries/recipients', { auth: true }),
  create: (input: DeliveryInput) => api<Delivery>('/api/admin/deliveries', { method: 'POST', body: input, auth: true }),
  accept: (id: number, comment?: string) => action(id, 'accept', comment),
  reject: (id: number, comment?: string) => action(id, 'reject', comment),
  cancel: (id: number, comment?: string) => action(id, 'cancel', comment),
  comment: (id: number, comment: string) =>
    api<Delivery>(`/api/admin/deliveries/${id}/comments`, { method: 'POST', body: { comment }, auth: true }),
}
