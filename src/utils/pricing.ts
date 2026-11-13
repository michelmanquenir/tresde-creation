// Cálculo de costos y precio sugerido de un producto impreso en 3D.
//
//   filamento  = gramos por pieza × precio por kg ÷ 1000
//   máquina    = horas del lote × valor hora ÷ piezas del lote   (imprimir varias a la vez abarata cada una)
//   costo      = filamento + máquina + accesorios
//   sugerido   = costo × multiplicador (redondeado hacia arriba a la decena)
//
// Al vender, se aparta un % del precio para recuperar la máquina:
//   ganancia   = precio − costo − (precio × % máquina)

import type { Material, ProductCost } from '../data/catalog'

export type CostSettings = {
  machineHourCost: number // pesos por hora de impresora
  machineReservePercent: number // % de cada venta que se aparta para la máquina
  priceMultiplier: number // precio sugerido = costo × multiplicador
  filamentPricePerKg: Record<Material, number>
}

export type CostBreakdown = {
  filament: number
  machine: number
  accessories: number
  total: number
  suggested: number
}

export type SaleSummary = {
  reserve: number // lo que se aparta para la máquina
  profit: number // ganancia real
  margin: number // ganancia ÷ precio (0 a 1, puede ser negativo)
}

const roundUpTo10 = (n: number) => Math.ceil(n / 10) * 10

/** Devuelve null si el producto todavía no tiene datos de costo. */
export function computeCost(cost: ProductCost | undefined, material: Material, s: CostSettings): CostBreakdown | null {
  if (!cost || (!cost.grams && !cost.batchHours && !cost.accessoriesCost)) return null
  const filament = ((cost.grams ?? 0) * (s.filamentPricePerKg[material] ?? 0)) / 1000
  const machine = ((cost.batchHours ?? 0) * s.machineHourCost) / Math.max(1, cost.batchPieces ?? 1)
  const accessories = cost.accessoriesCost ?? 0
  const total = filament + machine + accessories
  return { filament, machine, accessories, total, suggested: roundUpTo10(total * s.priceMultiplier) }
}

export function saleSummary(price: number, totalCost: number, s: CostSettings): SaleSummary {
  const reserve = (price * s.machineReservePercent) / 100
  const profit = price - totalCost - reserve
  return { reserve, profit, margin: price > 0 ? profit / price : 0 }
}

/** Formato con decimales solo cuando hacen falta (costos chicos como $10,5). */
export const formatCost = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 1 }).format(n)
