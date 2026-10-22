// Datos de ejemplo. Cuando tengas backend, reemplaza esto por llamadas a tu API.

export type Category = {
  slug: string
  name: string
  description: string
  icon: string // nombre del icono en components/Icon.tsx
  hue: number // tono base para las imágenes de relleno
}

export type Product = {
  id: string
  name: string
  category: string // slug de la categoría
  price: number
  oldPrice?: number
  description: string
  material: 'PLA' | 'PETG' | 'Resina' | 'TPU'
  colors: string[] // hex
  image?: string // ruta a la foto real (ej. /productos/dragon.jpg)
  isNew?: boolean
  bestSeller?: boolean
  rating: number
  printHours: number
}

export const STORE_NAME = 'TresD'
export const CURRENCY = { locale: 'es-CL', code: 'CLP' }

export const formatPrice = (value: number) =>
  new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    maximumFractionDigits: 0,
  }).format(value)

export const categories: Category[] = [
  { slug: 'decoracion', name: 'Decoración', description: 'Macetas, lámparas y piezas para darle vida a tu espacio.', icon: 'vase', hue: 18 },
  { slug: 'figuras', name: 'Figuras', description: 'Coleccionables, miniaturas y bustos con gran detalle.', icon: 'figure', hue: 265 },
  { slug: 'hogar', name: 'Hogar y organización', description: 'Soportes, organizadores y soluciones prácticas.', icon: 'home', hue: 160 },
  { slug: 'gaming', name: 'Gaming', description: 'Soportes de control, dados, accesorios de escritorio.', icon: 'gamepad', hue: 210 },
  { slug: 'accesorios', name: 'Llaveros y accesorios', description: 'Pequeños regalos y detalles personalizables.', icon: 'key', hue: 340 },
  { slug: 'repuestos', name: 'Repuestos técnicos', description: 'Piezas funcionales, engranajes y reemplazos a medida.', icon: 'gear', hue: 45 },
]

export const products: Product[] = [
  { id: 'maceta-geometrica', name: 'Maceta geométrica Low-Poly', category: 'decoracion', price: 12990, description: 'Maceta facetada con drenaje y plato incluido. Ideal para suculentas y cactus.', material: 'PLA', colors: ['#f4f1ea', '#2b2b2b', '#e86a3a', '#6aa88f'], isNew: true, rating: 4.8, printHours: 6 },
  { id: 'lampara-luna', name: 'Lámpara Luna litofanía', category: 'decoracion', price: 24990, oldPrice: 29990, description: 'Lámpara con relieve lunar real impreso como litofanía. Incluye base LED USB.', material: 'PLA', colors: ['#f4f1ea'], bestSeller: true, rating: 4.9, printHours: 14 },
  { id: 'jarron-espiral', name: 'Jarrón espiral', category: 'decoracion', price: 15990, description: 'Jarrón decorativo con patrón en espiral. Para flores secas.', material: 'PETG', colors: ['#c9b8f0', '#9fd8c9', '#f2c14e'], isNew: true, rating: 4.6, printHours: 9 },
  { id: 'dragon-articulado', name: 'Dragón articulado', category: 'figuras', price: 18990, description: 'Dragón flexible impreso en una sola pieza, sin ensamblaje. 30 cm de largo.', material: 'PLA', colors: ['#7b4bd6', '#e8443a', '#1e9e6a', '#d4af37'], bestSeller: true, isNew: true, rating: 5, printHours: 11 },
  { id: 'busto-resina', name: 'Busto de personaje en resina', category: 'figuras', price: 39990, description: 'Busto de alta resolución en resina, listo para pintar. 12 cm de alto.', material: 'Resina', colors: ['#bdbdbd'], rating: 4.7, printHours: 8 },
  { id: 'miniaturas-rol', name: 'Set de miniaturas de rol (5)', category: 'figuras', price: 21990, description: 'Cinco miniaturas a escala 28 mm para tus partidas de rol.', material: 'Resina', colors: ['#bdbdbd'], isNew: true, rating: 4.8, printHours: 5 },
  { id: 'organizador-escritorio', name: 'Organizador modular de escritorio', category: 'hogar', price: 14990, description: 'Módulos que encajan entre sí para lápices, clips y cables.', material: 'PLA', colors: ['#2b2b2b', '#f4f1ea', '#3a7be8'], bestSeller: true, rating: 4.7, printHours: 10 },
  { id: 'soporte-audifonos', name: 'Soporte para audífonos', category: 'hogar', price: 9990, description: 'Soporte estable con base antideslizante y canal para cables.', material: 'PETG', colors: ['#2b2b2b', '#e86a3a'], rating: 4.5, printHours: 5 },
  { id: 'gancho-pared', name: 'Ganchos de pared (pack x4)', category: 'hogar', price: 5990, description: 'Ganchos resistentes con tornillos incluidos. Soportan hasta 5 kg.', material: 'PETG', colors: ['#f4f1ea', '#2b2b2b'], isNew: true, rating: 4.4, printHours: 3 },
  { id: 'soporte-control', name: 'Soporte doble para controles', category: 'gaming', price: 11990, oldPrice: 13990, description: 'Mantén tus controles ordenados. Compatible con los modelos más populares.', material: 'PLA', colors: ['#2b2b2b', '#ffffff', '#e8443a'], bestSeller: true, rating: 4.8, printHours: 7 },
  { id: 'torre-dados', name: 'Torre de dados medieval', category: 'gaming', price: 19990, description: 'Torre de dados con forma de castillo y bandeja recolectora.', material: 'PLA', colors: ['#8a8a8a', '#6b4f3a'], isNew: true, rating: 4.9, printHours: 16 },
  { id: 'llavero-nombre', name: 'Llavero con tu nombre', category: 'accesorios', price: 3990, description: 'Llavero personalizado en dos colores. Escríbenos el texto al comprar.', material: 'PLA', colors: ['#e8443a', '#3a7be8', '#1e9e6a', '#f2c14e', '#7b4bd6'], bestSeller: true, rating: 4.9, printHours: 1 },
  { id: 'porta-celular', name: 'Porta celular plegable', category: 'accesorios', price: 6990, description: 'Soporte plegable de bolsillo con tres ángulos de inclinación.', material: 'PETG', colors: ['#2b2b2b', '#9fd8c9'], isNew: true, rating: 4.6, printHours: 2 },
  { id: 'engranajes-repuesto', name: 'Engranaje de repuesto a medida', category: 'repuestos', price: 7990, description: 'Fabricamos el engranaje que necesitas a partir de tu pieza o medidas.', material: 'PETG', colors: ['#2b2b2b', '#f4f1ea'], rating: 4.7, printHours: 3 },
  { id: 'pies-goma', name: 'Patas antideslizantes TPU (x8)', category: 'repuestos', price: 4990, description: 'Patas flexibles para muebles y electrodomésticos.', material: 'TPU', colors: ['#2b2b2b'], rating: 4.5, printHours: 2 },
]

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug)
export const getProduct = (id?: string) => products.find((p) => p.id === id)
