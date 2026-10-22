import { Link } from 'react-router-dom'
import { formatPrice, getCategory, type Product } from '../data/catalog'
import { useCart } from '../context/CartContext'
import Icon from './Icon'
import ProductImage from './ProductImage'

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <article className="card">
      <Link to={`/producto/${product.id}`} className="card-media">
        <ProductImage product={product} />
        <div className="tags">
          {product.isNew && <span className="tag tag-new">Nuevo</span>}
          {discount > 0 && <span className="tag tag-sale">-{discount}%</span>}
        </div>
      </Link>
      <div className="card-body">
        <span className="card-cat">{getCategory(product.category)?.name}</span>
        <Link to={`/producto/${product.id}`} className="card-title">{product.name}</Link>
        <div className="card-meta">
          {product.rating ? (
            <span className="rating"><Icon name="star" size={14} filled /> {product.rating.toFixed(1)}</span>
          ) : (
            <span className="muted small">{product.heightCm ? `${product.heightCm} cm` : product.material}</span>
          )}
          <span className="swatches">
            {product.colors.slice(0, 4).map((c) => (
              <span key={c} className="swatch sm" style={{ background: c }} />
            ))}
            {product.colors.length > 4 && <span className="muted small">+{product.colors.length - 4}</span>}
          </span>
        </div>
        <div className="card-foot">
          <div className="price">
            <strong>{formatPrice(product.price)}</strong>
            {product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}
          </div>
          <button
            className="icon-btn add-btn"
            onClick={() => add(product.id, product.colors[0])}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}
