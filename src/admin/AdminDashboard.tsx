import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, type Product } from '../data/catalog'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../api/products'
import Icon from '../components/Icon'

// Inicio del panel: resumen del catálogo y accesos rápidos.
export default function AdminDashboard() {
  const { session } = useAuth()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .list()
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos.'))
  }, [])

  const list = products ?? []
  const visible = list.filter((p) => !p.hidden).length
  const onSale = list.filter((p) => p.oldPrice && p.oldPrice > p.price).length
  const noPhotos = list.filter((p) => !p.images?.length)
  const byCategory = categories.map((c) => ({ ...c, count: list.filter((p) => p.category === c.slug).length }))
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count))

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Hola, {session?.name.split(' ')[0]}</h1>
          <p className="muted">Este es el resumen de tu tienda.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="admin-stats">
        <div><strong>{products ? list.length : '–'}</strong><span>productos en total</span></div>
        <div><strong>{products ? visible : '–'}</strong><span>visibles en tienda</span></div>
        <div><strong>{products ? list.length - visible : '–'}</strong><span>ocultos</span></div>
        <div><strong>{products ? onSale : '–'}</strong><span>en oferta</span></div>
      </div>

      <div className="dash-actions">
        <Link to="/admin/productos/nuevo" className="dash-action">
          <span className="dash-action-icon"><Icon name="plus" /></span>
          <strong>Nuevo producto</strong>
          <span className="muted small">Agrega una figura o artículo al catálogo.</span>
        </Link>
        <Link to="/admin/productos" className="dash-action">
          <span className="dash-action-icon"><Icon name="layers" /></span>
          <strong>Gestionar productos</strong>
          <span className="muted small">Edita precios, fotos y visibilidad.</span>
        </Link>
        <Link to="/" className="dash-action">
          <span className="dash-action-icon"><Icon name="cart" /></span>
          <strong>Ver tienda</strong>
          <span className="muted small">Mira la tienda como la ven tus clientes.</span>
        </Link>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h2 className="legend">Productos por categoría</h2>
          <ul className="dash-bars">
            {byCategory.map((c) => (
              <li key={c.slug}>
                <span className="dash-bar-label"><Icon name={c.icon} size={16} /> {c.name}</span>
                <span className="dash-bar-track">
                  <span className="dash-bar-fill" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                </span>
                <strong>{products ? c.count : '–'}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="legend">Productos sin foto</h2>
          {!products ? (
            <p className="muted small">Cargando…</p>
          ) : noPhotos.length === 0 ? (
            <p className="muted small"><Icon name="check" size={16} /> Todos los productos tienen al menos una foto.</p>
          ) : (
            <ul className="dash-list">
              {noPhotos.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <Link to={`/admin/productos/${p.id}/editar`} className="btn btn-ghost btn-sm">Agregar foto</Link>
                </li>
              ))}
              {noPhotos.length > 6 && <li className="muted small">y {noPhotos.length - 6} más…</li>}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
