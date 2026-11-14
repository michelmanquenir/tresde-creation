// Estadísticas de ventas calculadas en el navegador a partir del listado del período.
//
//   ingreso  = cantidad × precio unitario
//   costo    = cantidad × costo unitario (congelado al vender; puede faltar)
//   máquina  = ingreso × % máquina
//   ganancia = ingreso − costo − máquina   (solo de las ventas con costo conocido)

import type { Sale } from '../api/sales'

export type PeriodKey = 'month' | 'lastMonth' | 'days30' | 'year' | 'all'

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes anterior' },
  { key: 'days30', label: 'Últimos 30 días' },
  { key: 'year', label: 'Este año' },
  { key: 'all', label: 'Todo' },
]

/** Rango [from, to) en hora local. */
export function periodRange(key: PeriodKey, now = new Date()): { from?: Date; to?: Date } {
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (key) {
    case 'month':
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) }
    case 'lastMonth':
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
    case 'days30': {
      const from = new Date(y, m, now.getDate() - 29)
      return { from, to: new Date(y, m, now.getDate() + 1) }
    }
    case 'year':
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) }
    case 'all':
      return {}
  }
}

export const saleRevenue = (s: Sale) => s.quantity * s.unitPrice
export const saleReserve = (s: Sale) => (saleRevenue(s) * s.reservePercent) / 100
export const saleProfit = (s: Sale) =>
  s.unitCost === undefined || s.unitCost === null ? null : saleRevenue(s) - s.unitCost * s.quantity - saleReserve(s)

export type SalesTotals = {
  count: number
  units: number
  revenue: number
  reserve: number
  profit: number // de las ventas con costo conocido
  withoutCost: number // ventas sin dato de costo
  avgTicket: number
}

export function totals(sales: Sale[]): SalesTotals {
  let units = 0, revenue = 0, reserve = 0, profit = 0, withoutCost = 0
  for (const s of sales) {
    units += s.quantity
    revenue += saleRevenue(s)
    reserve += saleReserve(s)
    const p = saleProfit(s)
    if (p === null) withoutCost++
    else profit += p
  }
  return { count: sales.length, units, revenue, reserve, profit, withoutCost, avgTicket: sales.length ? revenue / sales.length : 0 }
}

export type Bucket = { key: string; label: string; revenue: number; units: number }

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Ventas agrupadas por día (rangos de hasta ~2 meses) o por mes, incluyendo los períodos sin ventas. */
export function buckets(sales: Sale[], from?: Date, to?: Date): { unit: 'day' | 'month'; items: Bucket[] } {
  const dates = sales.map((s) => new Date(s.soldAt))
  const start = from ?? (dates.length ? new Date(Math.min(...dates.map(Number))) : new Date())
  const end = to ?? new Date()
  const days = (Number(end) - Number(start)) / 86400000
  const unit = days <= 62 ? 'day' : 'month'

  const keyOf = (d: Date) =>
    unit === 'day' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  const map = new Map<string, Bucket>()
  const cursor = unit === 'day' ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : new Date(start.getFullYear(), start.getMonth(), 1)
  for (let i = 0; cursor < end && i < 400; i++) {
    const label = unit === 'day' ? `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}` : `${MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`
    map.set(keyOf(cursor), { key: keyOf(cursor), label, revenue: 0, units: 0 })
    if (unit === 'day') cursor.setDate(cursor.getDate() + 1)
    else cursor.setMonth(cursor.getMonth() + 1)
  }
  for (const s of sales) {
    const b = map.get(keyOf(new Date(s.soldAt)))
    if (b) {
      b.revenue += saleRevenue(s)
      b.units += s.quantity
    }
  }
  return { unit, items: [...map.values()] }
}

export type ProductRank = { key: string; name: string; units: number; revenue: number; profit: number | null }

/** Productos más vendidos (por ingreso). */
export function topProducts(sales: Sale[], limit = 6): ProductRank[] {
  const map = new Map<string, ProductRank>()
  for (const s of sales) {
    const key = s.productId ?? s.productName
    const r = map.get(key) ?? { key, name: s.productName, units: 0, revenue: 0, profit: 0 }
    r.units += s.quantity
    r.revenue += saleRevenue(s)
    const p = saleProfit(s)
    r.profit = p === null || r.profit === null ? null : r.profit + p
    map.set(key, r)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

/** Ingreso por canal de venta. */
export function byChannel(sales: Sale[]): { channel: string; revenue: number; count: number }[] {
  const map = new Map<string, { channel: string; revenue: number; count: number }>()
  for (const s of sales) {
    const channel = s.channel ?? 'Sin canal'
    const r = map.get(channel) ?? { channel, revenue: 0, count: 0 }
    r.revenue += saleRevenue(s)
    r.count++
    map.set(channel, r)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}
