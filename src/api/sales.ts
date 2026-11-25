import { api } from './client'

/** Venta registrada desde el panel (precio, costo y % máquina quedan congelados al momento de vender). */
export type Sale = {
  id: number
  productId?: string // puede apuntar a un producto que ya se eliminó
  productName: string
  category?: string
  color?: string
  quantity: number
  unitPrice: number
  unitCost?: number // materia prima por unidad (filamento + accesorios). En ventas antiguas incluía la luz.
  unitFilamentCost?: number // desglose (no viene en ventas antiguas)
  unitAccessoriesCost?: number
  reservePercent: number
  stockDiscounted: boolean
  channel?: string
  customer?: string
  note?: string
  closingId?: number // cuadratura en que se cerró (no viene si está pendiente)
  soldAt: string // ISO
  createdAt: string
  soldBy?: string // usuario que la registró (no viene en ventas antiguas)
  soldByName?: string
}

export type SaleInput = {
  productId: string
  color?: string
  quantity: number
  unitPrice?: number
  channel?: string
  customer?: string
  note?: string
  soldAt?: string // ISO
}

export const CHANNELS = ['Tienda web', 'WhatsApp', 'Instagram', 'Presencial', 'Feria', 'Otro'] as const

export const salesApi = {
  list: (from?: Date, to?: Date) => {
    const q = new URLSearchParams()
    if (from) q.set('from', from.toISOString())
    if (to) q.set('to', to.toISOString())
    const qs = q.toString()
    return api<Sale[]>(`/api/admin/sales${qs ? `?${qs}` : ''}`, { auth: true })
  },
  create: (input: SaleInput) => api<Sale>('/api/admin/sales', { method: 'POST', body: input, auth: true }),
  remove: (id: number) => api<void>(`/api/admin/sales/${id}`, { method: 'DELETE', auth: true }),
}
