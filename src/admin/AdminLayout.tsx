import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { STORE_NAME } from '../data/catalog'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import './admin.css'

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

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
            <span className="admin-user" title={session?.username}>
              <span className="admin-avatar" aria-hidden="true">{session?.name.charAt(0)}</span>
              <span className="hide-mobile">{session?.name}</span>
            </span>
            <button className="admin-logout" onClick={onLogout}>Cerrar sesión</button>
          </nav>
        </div>
      </header>
      <main className="container admin-main">
        <Outlet />
      </main>
    </div>
  )
}
