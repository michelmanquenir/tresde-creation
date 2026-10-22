import { Link } from 'react-router-dom'
import { categories, STORE_NAME } from '../data/catalog'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <span className="logo">{STORE_NAME}</span>
          <p className="muted">
            Objetos impresos en 3D, diseñados y fabricados capa por capa en nuestro taller.
          </p>
        </div>
        <div>
          <h4>Categorías</h4>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}><Link to={`/categoria/${c.slug}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Ayuda</h4>
          <ul>
            <li><Link to="/personalizado">Pedidos a medida</Link></li>
            <li><a href="#">Envíos y plazos</a></li>
            <li><a href="#">Cambios y devoluciones</a></li>
            <li><a href="#">Preguntas frecuentes</a></li>
          </ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            <li><a href="#">Instagram</a></li>
            <li><a href="#">WhatsApp</a></li>
            <li><a href="#">contacto@tutienda.com</a></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom muted small">
        © {YEAR} {STORE_NAME}. Todos los derechos reservados.
      </div>
    </footer>
  )
}
