import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/catalog'
import { useProducts } from './ProductsContext'

// Unidades de un producto que hay en el carrito (todos los colores)
const inCart = (items: CartItem[], id: string) => items.reduce((n, i) => (i.id === id ? n + i.qty : n), 0)

export type CartItem = { id: string; color: string; qty: number }

type CartValue = {
  items: (CartItem & { product: Product; maxQty: number })[] // qty ya ajustada al stock
  count: number
  total: number
  isOpen: boolean
  open: () => void
  close: () => void
  add: (id: string, color: string, qty?: number) => void
  setQty: (id: string, color: string, qty: number) => void
  /** Unidades que aún se pueden agregar de un producto (el stock se comparte entre colores) */
  available: (id: string) => number
  remove: (id: string, color: string) => void
}

const CartContext = createContext<CartValue | null>(null)
const STORAGE_KEY = 'tresd-cart'

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<CartItem[]>(loadCart)
  const [isOpen, setIsOpen] = useState(false)
  const { getProduct } = useProducts()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [raw])

  const value = useMemo<CartValue>(() => {
    const stockOf = (id: string) => getProduct(id)?.stock ?? 0
    const same = (a: CartItem, id: string, color: string) => a.id === id && a.color === color

    // Si el stock bajó después de agregar, se ajusta lo que hay en el carrito (en orden de llegada)
    const used = new Map<string, number>()
    const items = raw.flatMap((item) => {
      const product = getProduct(item.id)
      if (!product) return []
      const left = Math.max(0, stockOf(item.id) - (used.get(item.id) ?? 0))
      const qty = Math.min(item.qty, left)
      used.set(item.id, (used.get(item.id) ?? 0) + qty)
      return [{ ...item, qty, product, maxQty: qty + Math.max(0, left - qty) }]
    })
    // maxQty definitivo: lo que tiene la línea + lo que quede libre del producto
    for (const i of items) i.maxQty = i.qty + Math.max(0, stockOf(i.id) - (used.get(i.id) ?? 0))

    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.product.price, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      available: (id) => Math.max(0, stockOf(id) - (used.get(id) ?? 0)),
      add: (id, color, qty = 1) => {
        setRaw((prev) => {
          const n = Math.min(qty, stockOf(id) - inCart(prev, id))
          if (n <= 0) return prev
          return prev.some((i) => same(i, id, color))
            ? prev.map((i) => (same(i, id, color) ? { ...i, qty: i.qty + n } : i))
            : [...prev, { id, color, qty: n }]
        })
        setIsOpen(true)
      },
      setQty: (id, color, qty) =>
        setRaw((prev) => {
          if (qty <= 0) return prev.filter((i) => !same(i, id, color))
          const current = prev.find((i) => same(i, id, color))?.qty ?? 0
          const max = stockOf(id) - (inCart(prev, id) - current)
          return prev.map((i) => (same(i, id, color) ? { ...i, qty: Math.min(qty, Math.max(max, 0)) } : i))
        }),
      remove: (id, color) => setRaw((prev) => prev.filter((i) => !same(i, id, color))),
    }
  }, [raw, isOpen, getProduct])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
