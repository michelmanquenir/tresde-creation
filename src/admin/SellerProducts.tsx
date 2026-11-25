import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LOW_STOCK, formatPrice } from '../data/catalog'
import { useCategories } from '../context/CategoriesContext'
import { useProducts } from '../context/ProductsContext'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'

// Productos para el vendedor: solo los publicados, con precio de catálogo y stock.
// Sin costos, ganancias, precios anteriores ni edición. Desde aquí se registra la venta.
export default function SellerProducts() {
  const { visibleProducts, status, error } = useProducts()
  const { categories, getCategory } = useCategories()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [onlyStock, setOnlyStock] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...visibleProducts]
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => !category || p.category === category || p.categories?.includes(category))
      .filter((p) => !onlyStock || p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [visibleProducts, query, category, onlyStock])

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Productos</h1>
          <p className="muted">Busca un producto, revisa su precio y stock, y registra la venta.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="admin-toolbar">
        <div className="search admin-search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar productos" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Solo con stock
        </label>
      </div>

      {status === 'loading' ? (
        <p className="muted small">Cargando productos…</p>
      ) : list.length === 0 ? (
        <div className="panel empty">
          <Icon name="image" size={36} />
          <p className="muted">Ningún producto coincide con la búsqueda.</p>
        </div>
      ) : (
        <div className="admin-table" role="table" aria-label="Productos">
          <div className="seller-row admin-row-head" role="row">
            <span role="columnheader">Producto</span>
            <span role="columnheader">Precio</span>
            <span role="columnheader">Stock</span>
            <span role="columnheader" />
          </div>
          {list.map((p) => (
            <div key={p.id} className="seller-row" role="row">
              <div className="admin-product" role="cell">
                <div className="admin-thumb"><ProductImage product={p} /></div>
                <div>
                  <span className="admin-name">{p.name}</span>
                  <span className="muted small">{getCategory(p.category)?.name ?? ''}</span>
                  {p.colors.length > 1 && (
                    <span className="seller-colors" aria-label={`${p.colors.length} colores`}>
                      {p.colors.map((c) => <span key={c} className="swatch sm" style={{ background: c }} />)}
                    </span>
                  )}
                </div>
              </div>
              <span role="cell"><strong>{formatPrice(p.price)}</strong></span>
              <span role="cell">
                {!p.stock ? (
                  <span className="tag tag-out">Agotado</span>
                ) : (
                  <span className={`tag ${p.stock <= LOW_STOCK ? 'tag-low' : 'tag-ok'}`}>{p.stock} disponibles</span>
                )}
              </span>
              <span role="cell" className="right">
                {p.stock > 0 ? (
                  <Link to={`/admin/ventas?producto=${encodeURIComponent(p.id)}`} className="btn btn-primary btn-sm">
                    <Icon name="cart" size={16} /> Vender
                  </Link>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" disabled title="Sin stock">Vender</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
