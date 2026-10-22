import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice, getCategory, getProduct, products } from '../data/catalog'
import { useCart } from '../context/CartContext'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import NotFound from './NotFound'

export default function ProductPage() {
  const { id } = useParams()
  const product = getProduct(id)
  // key={id} en App reinicia este estado al cambiar de producto
  const [color, setColor] = useState(product?.colors[0] ?? '')
  const [qty, setQty] = useState(1)
  const { add } = useCart()

  if (!product) return <NotFound />

  const category = getCategory(product.category)
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Ruta">
        <Link to="/">Inicio</Link> /{' '}
        <Link to={`/categoria/${category?.slug}`}>{category?.name}</Link> / <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp-media">
          <ProductImage product={product} color={color} />
        </div>

        <div className="pdp-info">
          <span className="card-cat">{category?.name}</span>
          <h1>{product.name}</h1>
          <div className="rating">
            <Icon name="star" size={16} filled /> {product.rating.toFixed(1)}
            <span className="muted small"> · Impresión aprox. {product.printHours} h</span>
          </div>

          <div className="price lg">
            <strong>{formatPrice(product.price)}</strong>
            {product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}
          </div>

          <p>{product.description}</p>

          <div className="option">
            <span className="option-label">Color</span>
            <div className="swatches">
              {product.colors.map((c) => (
                <button
                  key={c}
                  className={`swatch lg ${c === color ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={c === color}
                />
              ))}
            </div>
          </div>

          <div className="option">
            <span className="option-label">Material</span>
            <span className="chip sm active">{product.material}</span>
          </div>

          <div className="buy-row">
            <div className="qty lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos"><Icon name="minus" size={16} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Más"><Icon name="plus" size={16} /></button>
            </div>
            <button className="btn btn-primary btn-grow" onClick={() => add(product.id, color, qty)}>
              <Icon name="cart" size={18} /> Agregar al carrito
            </button>
          </div>

          <ul className="pdp-perks">
            <li><Icon name="truck" size={18} /> Despacho en 3–5 días hábiles</li>
            <li><Icon name="layers" size={18} /> Impreso a pedido en {product.material}</li>
            <li><Icon name="sparkle" size={18} /> ¿Otro tamaño o color? <Link to="/personalizado">Pídelo a medida</Link></li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>También te puede gustar</h2></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
