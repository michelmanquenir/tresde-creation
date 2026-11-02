import { useProducts } from '../context/ProductsContext'

/** Muestra "cargando" o un error con botón de reintentar mientras llegan los productos. */
export default function LoadState({ skeletons = 4 }: { skeletons?: number }) {
  const { status, error, reload } = useProducts()

  if (status === 'error') {
    return (
      <div className="empty load-error" role="alert">
        <p>{error}</p>
        <button className="btn btn-ghost" onClick={reload}>Reintentar</button>
      </div>
    )
  }
  return (
    <div className="product-grid" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: skeletons }, (_, i) => (
        <div key={i} className="card skeleton">
          <div className="skeleton-media" />
          <div className="card-body">
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
          </div>
        </div>
      ))}
    </div>
  )
}
