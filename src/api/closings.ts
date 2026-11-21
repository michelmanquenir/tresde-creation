import { api } from './client'

/** Cuadratura semanal (o vista previa si no tiene id). */
export type Closing = {
  id?: number
  periodFrom?: string // primera venta incluida (ISO)
  periodTo: string // corte (ISO)
  salesCount: number
  units: number
  revenue: number
  materials: number // materia prima: se reinvierte
  machine: number // % para la máquina: se retira y abona a la impresora
  profit: number // ganancia: se retira
  salesWithoutCost: number // ventas sin costos cargados (su materia prima cuenta como 0)
  materialsReinvested?: number // lo que realmente se movió
  machineWithdrawn?: number
  profitWithdrawn?: number
  note?: string
  createdBy?: string
  createdAt?: string
}

export type ClosingsOverview = {
  machinePrice: number
  machineRecovered: number
  machineRemaining: number
  pendingSales: number
  closings: Closing[]
}

export type ClosingInput = {
  to: string // ISO
  materialsReinvested?: number
  machineWithdrawn?: number
  profitWithdrawn?: number
  note?: string
}

export const closingsApi = {
  overview: () => api<ClosingsOverview>('/api/admin/closings', { auth: true }),
  preview: (to: Date) => api<Closing>(`/api/admin/closings/preview?to=${encodeURIComponent(to.toISOString())}`, { auth: true }),
  create: (input: ClosingInput) => api<Closing>('/api/admin/closings', { method: 'POST', body: input, auth: true }),
  remove: (id: number) => api<void>(`/api/admin/closings/${id}`, { method: 'DELETE', auth: true }),
}

/** Domingo de la semana a cerrar: hoy si es domingo, si no el domingo pasado (fecha local, AAAA-MM-DD). */
export function lastSunday(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  return toDateInput(d)
}

export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Corte = fin del día elegido (00:00 del día siguiente, hora local). */
export function cutoffOf(dateInput: string): Date {
  const [y, m, d] = dateInput.split('-').map(Number)
  return new Date(y, m - 1, d + 1)
}
