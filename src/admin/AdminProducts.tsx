import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { categories, formatPrice, getCategory, type Product } from '../data/catalog'
import { useProducts } from '../context/ProductsContext'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'

export default function AdminProducts() {
  const { products, saveProduct, deleteProduct, replaceAll, resetToDemo } = useProducts()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const saved = (useLocation().state as { saved?: string } | null)?.saved

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q)),
    )
  }, [products, query, category])

  // Ejecuta una acción que guarda y muestra el error si no hay espacio
  const run = (action: () => void) => {
    try {
      setError('')
      action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const onDelete = (p: Product) => {
    if (confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) run(() => deleteProduct(p.id))
  }

  const onExport = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `productos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data) || !data.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string')) {
        throw new Error('El archivo no tiene el formato de productos esperado.')
      }
      if (confirm(`Se reemplazarán los ${products.length} productos actuales por ${data.length} del archivo. ¿Continuar?`)) {
        run(() => replaceAll(data))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo')
    }
  }

  const onReset = () => {
    if (confirm('¿Restaurar los productos de ejemplo? Se perderán los cambios que hiciste.')) run(resetToDemo)
  }

  const visible = products.filter((p) => !p.hidden).length

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Productos</h1>
          <p className="muted">Administra las figuras y productos que se muestran en la tienda.</p>
        </div>
        <Link to="/admin/nuevo" className="btn btn-primary">
          <Icon name="plus" size={18} /> Nuevo producto
        </Link>
      </div>

      <div className="admin-stats">
        <div><strong>{products.length}</strong><span>en total</span></div>
        <div><strong>{visible}</strong><span>visibles en tienda</span></div>
        <div><strong>{products.length - visible}</strong><span>ocultos</span></div>
        <div><strong>{products.filter((p) => p.isNew).length}</strong><span>marcados como nuevos</span></div>
      </div>

      {saved && !error && <div className="alert alert-ok">Se guardó “{saved}”.</div>}
      {error && <div className="alert">{error}</div>}

      <div className="admin-toolbar">
        <div className="search admin-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Buscar por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar productos"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <div className="admin-toolbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={onExport} title="Descargar respaldo en JSON">
            <Icon name="download" size={16} /> Exportar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} title="Cargar respaldo JSON">
            <Icon name="upload" size={16} /> Importar
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onImport} />
          <button className="btn btn-ghost btn-sm" onClick={onReset}>Restaurar ejemplos</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <Icon name="image" size={36} />
          <p className="muted">{products.length ? 'Ningún producto coincide con la búsqueda.' : 'Aún no tienes productos.'}</p>
          <Link to="/admin/nuevo" className="btn btn-primary">Crear el primero</Link>
        </div>
      ) : (
        <div className="admin-table" role="table" aria-label="Lista de productos">
          <div className="admin-row admin-row-head" role="row">
            <span role="columnheader">Producto</span>
            <span role="columnheader">Categoría</span>
            <span role="columnheader">Precio</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader" className="right">Acciones</span>
          </div>
          {list.map((p) => (
            <div key={p.id} className={`admin-row ${p.hidden ? 'is-hidden' : ''}`} role="row">
              <div className="admin-product" role="cell">
                <div className="admin-thumb"><ProductImage product={p} /></div>
                <div>
                  <Link to={`/admin/editar/${p.id}`} className="admin-name">{p.name}</Link>
                  <span className="muted small">
                    {p.material}
                    {p.heightCm ? ` · ${p.heightCm} cm` : ''} · {p.images?.length ?? 0} fotos
                  </span>
                </div>
              </div>
              <span role="cell" className="admin-cell-cat">{getCategory(p.category)?.name ?? '—'}</span>
              <span role="cell" className="admin-cell-price">
                <strong>{formatPrice(p.price)}</strong>
                {p.oldPrice && <s className="muted small">{formatPrice(p.oldPrice)}</s>}
              </span>
              <span role="cell" className="admin-badges">
                {p.hidden ? <span className="tag tag-muted">Oculto</span> : <span className="tag tag-ok">Visible</span>}
                {p.isNew && <span className="tag tag-new">Nuevo</span>}
                {p.bestSeller && <span className="tag tag-sale">Top</span>}
              </span>
              <span role="cell" className="admin-actions">
                <button
                  className="icon-btn"
                  onClick={() => run(() => saveProduct({ ...p, hidden: !p.hidden }))}
                  title={p.hidden ? 'Mostrar en tienda' : 'Ocultar de la tienda'}
                  aria-label={p.hidden ? 'Mostrar en tienda' : 'Ocultar de la tienda'}
                >
                  <Icon name={p.hidden ? 'eyeOff' : 'eye'} size={18} />
                </button>
                <Link to={`/admin/editar/${p.id}`} className="icon-btn" title="Editar" aria-label="Editar">
                  <Icon name="edit" size={18} />
                </Link>
                <button className="icon-btn danger" onClick={() => onDelete(p)} title="Eliminar" aria-label="Eliminar">
                  <Icon name="trash" size={18} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
