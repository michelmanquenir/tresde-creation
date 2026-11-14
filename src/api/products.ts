import type { Material, Product, ProductCost } from '../data/catalog'
import { api } from './client'

/** Datos que se envían para crear o editar un producto. */
export type ProductInput = {
  name: string
  category: string
  price: number
  oldPrice?: number
  description: string
  material: Material
  heightCm?: number
  printHours?: number
  stock: number
  colors: string[]
  images: string[]
  isNew: boolean
  bestSeller: boolean
  hidden: boolean
  cost?: ProductCost
}

// ── Tienda (público) ──
export const fetchProducts = (signal?: AbortSignal) => api<Product[]>('/api/products', { signal })

// ── Panel (requiere sesión de administrador) ──
export const adminApi = {
  list: () => api<Product[]>('/api/admin/products', { auth: true }),
  get: (id: string) => api<Product>(`/api/admin/products/${encodeURIComponent(id)}`, { auth: true }),
  create: (input: ProductInput) => api<Product>('/api/admin/products', { method: 'POST', body: input, auth: true }),
  update: (id: string, input: ProductInput) =>
    api<Product>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: input, auth: true }),
  setHidden: (id: string, hidden: boolean) =>
    api<Product>(`/api/admin/products/${encodeURIComponent(id)}/visibility`, {
      method: 'PATCH',
      body: { hidden },
      auth: true,
    }),
  setStock: (id: string, stock: number) =>
    api<Product>(`/api/admin/products/${encodeURIComponent(id)}/stock`, { method: 'PATCH', body: { stock }, auth: true }),
  remove: (id: string) => api<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
  importAll: (products: unknown[]) =>
    api<Product[]>('/api/admin/products/import', { method: 'POST', body: products, auth: true }),
  uploadImage: (image: Blob, filename = 'foto.jpg') => {
    const form = new FormData()
    form.append('file', image, filename)
    return api<{ id: string; url: string }>('/api/admin/images', { method: 'POST', body: form, auth: true })
  },
}
