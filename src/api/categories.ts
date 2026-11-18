import type { Category } from '../data/catalog'
import { api } from './client'

/** Categoría en el panel: incluye cuántos productos la usan. */
export type AdminCategory = Category & { products: number }

export type CategoryInput = { name: string; description: string; icon: string; hue: number }

export const categoriesApi = {
  list: () => api<AdminCategory[]>('/api/admin/categories', { auth: true }),
  create: (input: CategoryInput) => api<AdminCategory>('/api/admin/categories', { method: 'POST', body: input, auth: true }),
  update: (slug: string, input: CategoryInput) =>
    api<AdminCategory>(`/api/admin/categories/${encodeURIComponent(slug)}`, { method: 'PUT', body: input, auth: true }),
  reorder: (slugs: string[]) =>
    api<AdminCategory[]>('/api/admin/categories/reorder', { method: 'POST', body: slugs, auth: true }),
  remove: (slug: string) => api<void>(`/api/admin/categories/${encodeURIComponent(slug)}`, { method: 'DELETE', auth: true }),
}

/** Iconos que se pueden elegir para una categoría (nombres de components/Icon.tsx). */
export const CATEGORY_ICONS = [
  'vase', 'figure', 'home', 'gamepad', 'key', 'gear', 'star', 'sparkle', 'layers', 'palette', 'image', 'user', 'cart', 'truck', 'clock',
]
