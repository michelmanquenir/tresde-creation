import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { categories, getCategory, MATERIALS, type Product } from '../data/catalog'
import { useProducts } from '../context/ProductsContext'
import ProductCard from '../components/ProductCard'
import NotFound from './NotFound'


const sorters: Record<string, { label: string; fn: (a: Product, b: Product) => number }> = {
  relevancia: { label: 'Relevancia', fn: () => 0 },
  nuevos: { label: 'Novedades', fn: (a, b) => Number(!!b.isNew) - Number(!!a.isNew) },
  populares: { label: 'Más vendidos', fn: (a, b) => Number(!!b.bestSeller) - Number(!!a.bestSeller) || (b.rating ?? 0) - (a.rating ?? 0) },
  'precio-asc': { label: 'Precio: menor a mayor', fn: (a, b) => a.price - b.price },
  'precio-desc': { label: 'Precio: mayor a menor', fn: (a, b) => b.price - a.price },
}

// Sirve para /categoria/:slug y para /buscar?q=
export default function CategoryPage({ search = false }: { search?: boolean }) {
  const { slug } = useParams()
  const { visibleProducts: products } = useProducts()
  const [params, setParams] = useSearchParams()
  const [materials, setMaterials] = useState<string[]>([])

  const query = params.get('q')?.trim() ?? ''
  const sort = params.get('orden') ?? 'relevancia'
  const category = getCategory(slug)
  const isAll = slug === 'todos'

  const list = useMemo(() => {
    let result = products
    if (search) {
      const q = query.toLowerCase()
      result = result.filter((p) =>
        `${p.name} ${p.description} ${getCategory(p.category)?.name}`.toLowerCase().includes(q),
      )
    } else if (category) {
      result = result.filter((p) => p.category === category.slug)
    }
    if (materials.length) result = result.filter((p) => materials.includes(p.material))
    return [...result].sort((sorters[sort] ?? sorters.relevancia).fn)
  }, [products, search, query, category, materials, sort])

  if (!search && !isAll && !category) return <NotFound />

  const title = search ? `Resultados para “${query}”` : category?.name ?? 'Todos los productos'
  const description = search
    ? `${list.length} productos encontrados`
    : category?.description ?? 'Todo nuestro catálogo de piezas impresas en 3D.'

  const toggleMaterial = (m: string) =>
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Ruta">
        <Link to="/">Inicio</Link> / <span>{search ? 'Búsqueda' : title}</span>
      </nav>

      <header className="page-head">
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </header>

      {!search && (
        <div className="chips" role="list">
          <Link to="/categoria/todos" className={`chip ${isAll ? 'active' : ''}`}>Todos</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={`/categoria/${c.slug}`} className={`chip ${c.slug === slug ? 'active' : ''}`}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="filter-group" aria-label="Filtrar por material">
          <span className="muted small">Material:</span>
          {MATERIALS.map((m) => (
            <button
              key={m}
              className={`chip sm ${materials.includes(m) ? 'active' : ''}`}
              onClick={() => toggleMaterial(m)}
              aria-pressed={materials.includes(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="sort">
          <span className="muted small">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => {
              params.set('orden', e.target.value)
              setParams(params, { replace: true })
            }}
          >
            {Object.entries(sorters).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {list.length ? (
        <div className="product-grid">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">
          <p>No encontramos productos con esos filtros.</p>
          <Link to="/personalizado" className="btn btn-ghost">¿Lo imprimimos a medida?</Link>
        </div>
      )}
    </div>
  )
}
