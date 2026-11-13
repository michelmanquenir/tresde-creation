import { useEffect, useState } from 'react'
import type { CostSettings } from '../utils/pricing'
import { api } from './client'

// ── Configuración de costos (requiere sesión de administrador) ──
export const settingsApi = {
  getCosts: () => api<CostSettings>('/api/admin/settings/costs', { auth: true }),
  saveCosts: (s: CostSettings) => api<CostSettings>('/api/admin/settings/costs', { method: 'PUT', body: s, auth: true }),
}

// Se guarda en memoria para no pedirla en cada pantalla del panel
let cached: CostSettings | null = null

export async function saveCostSettings(s: CostSettings) {
  cached = await settingsApi.saveCosts(s)
  return cached
}

/** Configuración de costos para las pantallas del panel (null mientras carga o si falló). */
export function useCostSettings() {
  const [settings, setSettings] = useState<CostSettings | null>(cached)

  useEffect(() => {
    if (cached) return
    let active = true
    settingsApi
      .getCosts()
      .then((s) => {
        cached = s
        if (active) setSettings(s)
      })
      .catch(() => {
        /* sin configuración: las pantallas simplemente no muestran costos */
      })
    return () => {
      active = false
    }
  }, [])

  return settings
}
