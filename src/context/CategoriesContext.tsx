import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_CATEGORIES, type Category } from '../data/catalog'
import { api } from '../api/client'
import type { LoadStatus } from './ProductsContext'

// Categorías de la tienda, cargadas desde el backend (GET /api/categories) y editables en el panel.
// Se guardan en el navegador para que el menú aparezca al instante en la próxima visita.

type CategoriesValue = {
  categories: Category[]
  status: LoadStatus
  getCategory: (slug?: string) => Category | undefined
  reload: () => void
}

const STORAGE_KEY = 'tresd-categories'
const CategoriesContext = createContext<CategoriesValue | null>(null)

function cached(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as Category[]) : null
    return Array.isArray(list) && list.length ? list : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(cached)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api<Category[]>('/api/categories', { signal: controller.signal })
      .then((list) => {
        if (!Array.isArray(list)) throw new Error('Respuesta inesperada')
        setCategories(list)
        setStatus('ready')
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
        } catch {
          /* sin almacenamiento */
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error') // se sigue usando la lista guardada
      })
    return () => controller.abort()
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  const value = useMemo<CategoriesValue>(
    () => ({ categories, status, getCategory: (slug) => categories.find((c) => c.slug === slug), reload }),
    [categories, status, reload],
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories debe usarse dentro de CategoriesProvider')
  return ctx
}
