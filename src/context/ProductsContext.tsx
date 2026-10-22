import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { demoProducts, type Product } from '../data/catalog'

// Almacén de productos. Hoy guarda en localStorage (solo este navegador).
// Cuando tengas backend, cambia load() y commit() por llamadas a tu API;
// el resto de la app no necesita cambios.

const STORAGE_KEY = 'tresd-products'

type ProductsValue = {
  products: Product[] // todos, incluidos los ocultos (para el panel)
  visibleProducts: Product[] // los que se muestran en la tienda
  getProduct: (id?: string) => Product | undefined
  saveProduct: (product: Product) => void // crea o actualiza según el id
  deleteProduct: (id: string) => void
  replaceAll: (products: Product[]) => void
  resetToDemo: () => void
  newId: (name: string) => string
}

const ProductsContext = createContext<ProductsValue | null>(null)

function load(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* sin acceso o datos corruptos: usamos los de ejemplo */
  }
  return demoProducts
}

function persist(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error(
        'No queda espacio en el navegador para guardar. Usa fotos más livianas o elimina algunas imágenes.',
      )
    }
    // Si el almacenamiento no está disponible, seguimos solo en memoria.
  }
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto'

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(load)

  const value = useMemo<ProductsValue>(() => {
    const commit = (next: Product[]) => {
      persist(next) // lanza error si no hay espacio; en ese caso no se cambia nada
      setProducts(next)
    }
    return {
      products,
      visibleProducts: products.filter((p) => !p.hidden),
      getProduct: (id) => products.find((p) => p.id === id),
      saveProduct: (product) =>
        commit(
          products.some((p) => p.id === product.id)
            ? products.map((p) => (p.id === product.id ? product : p))
            : [product, ...products],
        ),
      deleteProduct: (id) => commit(products.filter((p) => p.id !== id)),
      replaceAll: (list) => commit(list),
      resetToDemo: () => commit(demoProducts),
      newId: (name) => {
        const base = slugify(name)
        let id = base
        for (let n = 2; products.some((p) => p.id === id); n++) id = `${base}-${n}`
        return id
      },
    }
  }, [products])

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts debe usarse dentro de ProductsProvider')
  return ctx
}
