import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { categories, formatPrice, getCategory, type Product } from '../data/catalog'
import { useProducts } from '../context/ProductsContext'
import { adminApi } from '../api/products'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'
import StockEditor from './StockEditor'
import { useCostSettings } from '../api/settings'
import { computeCost, formatCost, saleSummary, type CostSettings } from '../utils/pricing'

// Ganancia por pieza bajo el precio (en rojo si se pierde dinero, en ámbar si está bajo el sugerido)
function ProfitHint({ product: p, settings }: { product: Product; settings: CostSettings | null }) {
  if (!settings) return null
  const cost = computeCost(p.cost, p.material, settings)
  if (!cost) return <span className="profit-hint muted">Sin costos</span>
  const { profit } = saleSummary(p.price, cost.total, settings)
  const tone = profit < 0 ? 'is-loss' : p.price < cost.suggested ? 'is-low' : 'is-ok'
  const title = `Costo ${formatCost(cost.total)} · sugerido ${formatPrice(cost.suggested)}`
  return (
    <span className={`profit-hint ${tone}`} title={title}>
      Ganancia {formatCost(profit)}
    </span>
  )
}

export default function AdminProducts() {
  const { reload: reloadStore } = useProducts()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const saved = (useLocation().state as { saved?: string } | null)?.saved
  const [notice, setNotice] = useState(saved ? 'saved' : '')
  const fileInput = useRef<HTMLInputElement>(null)
  const costSettings = useCostSettings()

  const load = () =>
    adminApi
      .list()
      .then((list) => {
        setProducts(list)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos.'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q)),
    )
  }, [products, query, category])

  // Ejecuta una acción contra la API y muestra el error si falla
  const run = async (id: string, action: () => Promise<unknown>) => {
    setError('')
    setNotice('')
    setBusyId(id)
    try {
      await action()
      reloadStore()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    } finally {
      setBusyId('')
    }
  }

  const onToggleHidden = (p: Product) =>
    run(p.id, async () => {
      const updated = await adminApi.setHidden(p.id, !p.hidden)
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
    })

  const onSetStock = (p: Product, stock: number) =>
    run(p.id, async () => {
      const updated = await adminApi.setStock(p.id, stock)
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
    })

  const onDelete = (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return
    run(p.id, async () => {
      await adminApi.remove(p.id)
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
    })
  }

  const onExport = () => {
    const exportable = products.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest)
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' })
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
        await run('import', async () => {
          setProducts(await adminApi.importAll(data))
          setNotice('imported')
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo')
    }
  }

  const visible = products.filter((p) => !p.hidden).length

  if (loading) {
    return <div className="empty"><p className="muted">Cargando productos…</p></div>
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Productos</h1>
          <p className="muted">Administra las figuras y productos que se muestran en la tienda.</p>
        </div>
        <Link to="/admin/productos/nuevo" className="btn btn-primary">
          <Icon name="plus" size={18} /> Nuevo producto
        </Link>
      </div>

      <div className="admin-stats">
        <div><strong>{products.length}</strong><span>en total</span></div>
        <div><strong>{visible}</strong><span>visibles en tienda</span></div>
        <div><strong>{products.length - visible}</strong><span>ocultos</span></div>
        <div><strong>{products.filter((p) => !p.stock).length}</strong><span>agotados</span></div>
      </div>

      {notice === 'saved' && saved && !error && <div className="alert alert-ok">Se guardó “{saved}”.</div>}
      {notice === 'imported' && !error && <div className="alert alert-ok">Catálogo importado correctamente.</div>}
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
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <Icon name="image" size={36} />
          <p className="muted">{products.length ? 'Ningún producto coincide con la búsqueda.' : 'Aún no tienes productos.'}</p>
          <Link to="/admin/productos/nuevo" className="btn btn-primary">Crear el primero</Link>
        </div>
      ) : (
        <div className="admin-table" role="table" aria-label="Lista de productos">
          <div className="admin-row admin-row-head" role="row">
            <span role="columnheader">Producto</span>
            <span role="columnheader">Categoría</span>
            <span role="columnheader">Precio</span>
            <span role="columnheader">Stock</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader" className="right">Acciones</span>
          </div>
          {list.map((p) => (
            <div key={p.id} className={`admin-row ${p.hidden ? 'is-hidden' : ''}`} role="row">
              <div className="admin-product" role="cell">
                <div className="admin-thumb"><ProductImage product={p} /></div>
                <div>
                  <Link to={`/admin/productos/${p.id}/editar`} className="admin-name">{p.name}</Link>
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
                <ProfitHint product={p} settings={costSettings} />
              </span>
              <span role="cell">
                <StockEditor stock={p.stock ?? 0} disabled={busyId === p.id} onSave={(n) => onSetStock(p, n)} />
              </span>
              <span role="cell" className="admin-badges">
                {p.hidden ? <span className="tag tag-muted">Oculto</span> : <span className="tag tag-ok">Visible</span>}
                {p.isNew && <span className="tag tag-new">Nuevo</span>}
                {p.bestSeller && <span className="tag tag-sale">Top</span>}
              </span>
              <span role="cell" className="admin-actions">
                <button
                  className="icon-btn"
                  disabled={busyId === p.id}
                  onClick={() => onToggleHidden(p)}
                  title={p.hidden ? 'Mostrar en tienda' : 'Ocultar de la tienda'}
                  aria-label={p.hidden ? 'Mostrar en tienda' : 'Ocultar de la tienda'}
                >
                  <Icon name={p.hidden ? 'eyeOff' : 'eye'} size={18} />
                </button>
                <Link to={`/admin/productos/${p.id}/editar`} className="icon-btn" title="Editar" aria-label="Editar">
                  <Icon name="edit" size={18} />
                </Link>
                <button className="icon-btn danger" disabled={busyId === p.id} onClick={() => onDelete(p)} title="Eliminar" aria-label="Eliminar">
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
