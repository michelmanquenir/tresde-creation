import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { categories, products } from '../data/catalog'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'

export default function Home() {
  const newProducts = products.filter((p) => p.isNew).slice(0, 8)
  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 4)
  const featured = products.find((p) => p.id === 'dragon-articulado') ?? products[0]

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Icon name="sparkle" size={16} /> Nueva colección de otoño</span>
            <h1>Objetos únicos, impresos <em>capa por capa</em>.</h1>
            <p className="lead">
              Decoración, figuras, accesorios y piezas funcionales fabricadas en 3D en nuestro
              taller. Elige el color, nosotros lo imprimimos.
            </p>
            <div className="hero-actions">
              <Link to="/categoria/todos" className="btn btn-primary">
                Ver catálogo <Icon name="arrow" size={18} />
              </Link>
              <Link to="/personalizado" className="btn btn-ghost">Pedido a medida</Link>
            </div>
            <ul className="hero-stats">
              <li><strong>+1.200</strong><span>piezas entregadas</span></li>
              <li><strong>4.9 ★</strong><span>valoración media</span></li>
              <li><strong>24 colores</strong><span>de filamento</span></li>
            </ul>
          </div>
          <Link to={`/producto/${featured.id}`} className="hero-visual" aria-label={featured.name}>
            <ProductImage product={featured} />
            <div className="hero-chip">
              <span className="muted small">Destacado</span>
              <strong>{featured.name}</strong>
            </div>
          </Link>
        </div>
      </section>

      {/* Beneficios */}
      <section className="container perks">
        <div className="perk"><Icon name="truck" /><div><strong>Envíos a todo el país</strong><span>Despacho en 3–5 días hábiles</span></div></div>
        <div className="perk"><Icon name="layers" /><div><strong>Materiales de calidad</strong><span>PLA, PETG, TPU y resina</span></div></div>
        <div className="perk"><Icon name="clock" /><div><strong>Impreso a pedido</strong><span>Menos desperdicio, más opciones</span></div></div>
      </section>

      {/* Categorías */}
      <section className="container section">
        <div className="section-head">
          <h2>Explora por categoría</h2>
          <Link to="/categoria/todos" className="see-all">Ver todo <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/categoria/${c.slug}`}
              className="cat-card"
              style={{ '--hue': c.hue } as CSSProperties}
            >
              <span className="cat-icon"><Icon name={c.icon} size={28} /></span>
              <strong>{c.name}</strong>
              <span className="muted small">
                {products.filter((p) => p.category === c.slug).length} productos
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Novedades */}
      <section className="container section">
        <div className="section-head">
          <div>
            <h2>Recién salidos de la impresora</h2>
            <p className="muted">Los últimos diseños que sumamos a la tienda.</p>
          </div>
          <Link to="/categoria/todos?orden=nuevos" className="see-all">Ver novedades <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="product-grid">
          {newProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Banner pedido a medida */}
      <section className="container section">
        <div className="custom-banner">
          <div>
            <h2>¿Tienes una idea o un archivo STL?</h2>
            <p>
              Envíanos tu diseño o descríbenos lo que necesitas. Te cotizamos en menos de 24 horas
              y lo imprimimos con el material y color que elijas.
            </p>
            <Link to="/personalizado" className="btn btn-light">
              <Icon name="upload" size={18} /> Cotizar mi pieza
            </Link>
          </div>
          <ol className="steps">
            <li><span>1</span>Sube tu archivo o idea</li>
            <li><span>2</span>Recibe tu cotización</li>
            <li><span>3</span>Imprimimos y enviamos</li>
          </ol>
        </div>
      </section>

      {/* Más vendidos */}
      <section className="container section">
        <div className="section-head">
          <h2>Los más vendidos</h2>
          <Link to="/categoria/todos?orden=populares" className="see-all">Ver más <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="product-grid">
          {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Newsletter */}
      <section className="container section">
        <div className="newsletter">
          <div>
            <h2>Entérate primero de los nuevos diseños</h2>
            <p className="muted">Un correo al mes, con novedades y descuentos exclusivos.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="newsletter-form">
            <input type="email" placeholder="tu@correo.com" aria-label="Correo electrónico" required />
            <button className="btn btn-primary">Suscribirme</button>
          </form>
        </div>
      </section>
    </>
  )
}
