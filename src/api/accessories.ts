import { useEffect, useState } from 'react'
import type { AccessoryUse } from '../data/catalog'
import { api } from './client'

/** Accesorio del catálogo (argolla de llavero, mecanismo de clicker, imán…). */
export type Accessory = {
  id: number
  name: string
  cost: number // por unidad
  usedBy: number // cuántos productos lo llevan
}

export type AccessoryInput = { name: string; cost: number }

export const accessoriesApi = {
  list: () => api<Accessory[]>('/api/admin/accessories', { auth: true }),
  create: (input: AccessoryInput) => api<Accessory>('/api/admin/accessories', { method: 'POST', body: input, auth: true }),
  update: (id: number, input: AccessoryInput) =>
    api<Accessory>(`/api/admin/accessories/${id}`, { method: 'PUT', body: input, auth: true }),
  remove: (id: number) => api<void>(`/api/admin/accessories/${id}`, { method: 'DELETE', auth: true }),
}

/** Costo por pieza de los accesorios elegidos (undefined si no lleva ninguno). */
export function accessoriesCost(uses: AccessoryUse[], catalog: Accessory[]): number | undefined {
  if (!uses.length) return undefined
  return uses.reduce((sum, u) => sum + (catalog.find((a) => a.id === u.accessoryId)?.cost ?? 0) * u.quantity, 0)
}

/** Catálogo de accesorios para el formulario de producto (null mientras carga). */
export function useAccessories() {
  const [list, setList] = useState<Accessory[] | null>(null)

  useEffect(() => {
    let active = true
    accessoriesApi
      .list()
      .then((l) => active && setList(l))
      .catch(() => active && setList([]))
    return () => {
      active = false
    }
  }, [])

  return list
}
