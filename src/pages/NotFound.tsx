import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container page empty">
      <h1>Página no encontrada</h1>
      <p className="muted">Parece que esta pieza aún no ha salido de la impresora.</p>
      <Link to="/" className="btn btn-primary">Volver al inicio</Link>
    </div>
  )
}
