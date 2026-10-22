import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/catalog'
import { useProducts } from './ProductsContext'

export type CartItem = { id: string; color: string; qty: number }

type CartValue = {
  items: (CartItem & { product: Product })[]
  count: number
  total: number
  isOpen: boolean
  open: () => void
  close: () => void
  add: (id: string, color: string, qty?: number) => void
  setQty: (id: string, color: string, qty: number) => void
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
    const items = raw.flatMap((item) => {
      const product = getProduct(item.id)
      return product ? [{ ...item, product }] : []
    })
    const same = (a: CartItem, id: string, color: string) => a.id === id && a.color === color
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.product.price, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (id, color, qty = 1) => {
        setRaw((prev) =>
          prev.some((i) => same(i, id, color))
            ? prev.map((i) => (same(i, id, color) ? { ...i, qty: i.qty + qty } : i))
            : [...prev, { id, color, qty }],
        )
        setIsOpen(true)
      },
      setQty: (id, color, qty) =>
        setRaw((prev) =>
          qty <= 0
            ? prev.filter((i) => !same(i, id, color))
            : prev.map((i) => (same(i, id, color) ? { ...i, qty } : i)),
        ),
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
