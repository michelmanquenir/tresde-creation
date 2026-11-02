import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/catalog'
import { fetchProducts } from '../api/products'

// Productos visibles de la tienda, cargados desde el backend (GET /api/products).
// El panel de administración usa su propia API (ver api/products.ts -> adminApi).

export type LoadStatus = 'loading' | 'ready' | 'error'

type ProductsValue = {
  visibleProducts: Product[]
  status: LoadStatus
  error: string
  getProduct: (id?: string) => Product | undefined
  reload: () => void
}

const ProductsContext = createContext<ProductsValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
      .then((list) => {
        setProducts(list)
        setStatus('ready')
        setError('')
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos.')
        setStatus('error')
      })
    return () => controller.abort()
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  const value = useMemo<ProductsValue>(
    () => ({
      visibleProducts: products,
      status,
      error,
      getProduct: (id) => products.find((p) => p.id === id),
      reload,
    }),
    [products, status, error, reload],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts debe usarse dentro de ProductsProvider')
  return ctx
}
