import { Link, NavLink, Outlet } from 'react-router-dom'
import { STORE_NAME } from '../data/catalog'
import Icon from '../components/Icon'
import './admin.css'

export default function AdminLayout() {
  return (
    <div className="admin">
      <header className="admin-header">
        <div className="container admin-header-row">
          <Link to="/admin" className="logo">
            <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
            {STORE_NAME} <span className="admin-pill">Panel</span>
          </Link>
          <nav className="admin-nav">
            <NavLink to="/admin" end>Productos</NavLink>
            <NavLink to="/admin/nuevo">Nuevo producto</NavLink>
            <Link to="/" className="admin-store-link">
              Ver tienda <Icon name="arrow" size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main className="container admin-main">
        <Outlet />
      </main>
    </div>
  )
}
