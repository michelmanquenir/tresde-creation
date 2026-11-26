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
  soldBy?: string // usuario que hizo la venta (no viene en ventas antiguas)
  soldByName?: string
  paymentMethod?: PaymentMethod // no viene en ventas antiguas
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD'

export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transferencia' },
  { key: 'CARD', label: 'Tarjeta' },
]

export const paymentLabel = (m?: PaymentMethod) => PAYMENT_METHODS.find((p) => p.key === m)?.label ?? 'Sin dato'

/** Usuario del panel que puede figurar como vendedor. */
export type SaleSeller = { username: string; name: string; role: string }

export type SaleInput = {
  productId: string
  color?: string
  quantity: number
  unitPrice?: number
  channel?: string
  customer?: string
  note?: string
  soldAt?: string // ISO
  paymentMethod: PaymentMethod
  soldBy?: string // por defecto, quien registra (el vendedor siempre se registra a sí mismo)
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
  /** Solo administradores y trabajadores. */
  sellers: () => api<SaleSeller[]>('/api/admin/sales/sellers', { auth: true }),
  create: (input: SaleInput) => api<Sale>('/api/admin/sales', { method: 'POST', body: input, auth: true }),
  remove: (id: number) => api<void>(`/api/admin/sales/${id}`, { method: 'DELETE', auth: true }),
}
