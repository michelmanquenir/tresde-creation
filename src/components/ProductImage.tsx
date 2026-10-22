import type { CSSProperties } from 'react'
import { getCategory, type Product } from '../data/catalog'
import Icon from './Icon'

// Muestra la foto real si existe; si no, un relleno con "capas de impresión".
export default function ProductImage({ product, color }: { product: Product; color?: string }) {
  if (product.image) {
    return <img className="product-img" src={product.image} alt={product.name} loading="lazy" />
  }
  const cat = getCategory(product.category)
  const tint = color ?? product.colors[0]
  return (
    <div
      className="product-img placeholder"
      style={{ '--hue': cat?.hue ?? 20, '--tint': tint } as CSSProperties}
      role="img"
      aria-label={product.name}
    >
      <span className="placeholder-icon">
        <Icon name={cat?.icon ?? 'layers'} size={64} />
      </span>
    </div>
  )
}
