// Tipos, categorías y utilidades del catálogo. Los productos vienen del backend (api/products.ts).

export type Category = {
  slug: string
  name: string
  description: string
  icon: string // nombre del icono en components/Icon.tsx
  hue: number // tono base para las imágenes de relleno
}

export const MATERIALS = ['PLA', 'PETG', 'Resina', 'TPU'] as const
export type Material = (typeof MATERIALS)[number]

/** Datos para calcular el costo (solo panel). Ver utils/pricing.ts */
export type ProductCost = {
  grams?: number // filamento por pieza
  batchHours?: number // horas que tarda el lote completo
  batchPieces?: number // piezas que salen en ese lote
  accessoriesCost?: number // argollas, imanes, etc. por pieza
}

export type Product = {
  id: string
  name: string
  category: string // slug de la categoría
  price: number
  oldPrice?: number
  description: string
  material: Material
  colors: string[] // hex
  images?: string[] // la primera es la principal (URL o imagen subida desde el panel)
  heightCm?: number
  isNew?: boolean
  bestSeller?: boolean
  hidden?: boolean // oculto en la tienda, visible solo en el panel
  rating?: number
  printHours?: number
  createdAt?: string // los pone el backend
  updatedAt?: string
  cost?: ProductCost // solo llega al panel de administración
}

export const STORE_NAME = 'TresD'
export const CURRENCY = { locale: 'es-CL', code: 'CLP' }

export const formatPrice = (value: number) =>
  new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    maximumFractionDigits: 0,
  }).format(value)

// Deben coincidir con la tabla "categories" del backend (V2__datos_iniciales.sql).
export const categories: Category[] = [
  { slug: 'decoracion', name: 'Decoración', description: 'Macetas, lámparas y piezas para darle vida a tu espacio.', icon: 'vase', hue: 18 },
  { slug: 'figuras', name: 'Figuras', description: 'Coleccionables, miniaturas y bustos con gran detalle.', icon: 'figure', hue: 265 },
  { slug: 'hogar', name: 'Hogar y organización', description: 'Soportes, organizadores y soluciones prácticas.', icon: 'home', hue: 160 },
  { slug: 'gaming', name: 'Gaming', description: 'Soportes de control, dados, accesorios de escritorio.', icon: 'gamepad', hue: 210 },
  { slug: 'accesorios', name: 'Llaveros y accesorios', description: 'Pequeños regalos y detalles personalizables.', icon: 'key', hue: 340 },
  { slug: 'repuestos', name: 'Repuestos técnicos', description: 'Piezas funcionales, engranajes y reemplazos a medida.', icon: 'gear', hue: 45 },
]

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug)
