import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { STORE_NAME } from '../data/catalog'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import ThemePicker from '../components/ThemePicker'
import './admin.css'

// Menú del panel. "Productos" queda activo también al editar un producto.
const MENU = [
  { to: '/admin', label: 'Inicio', icon: 'home', isActive: (p: string) => p === '/admin' },
  {
    to: '/admin/productos',
    label: 'Productos',
    icon: 'layers',
    isActive: (p: string) => p.startsWith('/admin/productos') && p !== '/admin/productos/nuevo',
  },
  { to: '/admin/productos/nuevo', label: 'Nuevo producto', icon: 'plus', isActive: (p: string) => p === '/admin/productos/nuevo' },
  { to: '/admin/configuracion', label: 'Configuración', icon: 'gear', isActive: (p: string) => p === '/admin/configuracion' },
]

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const logo = (
    <Link to="/admin" className="logo">
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
      {STORE_NAME} <span className="admin-pill">Panel</span>
    </Link>
  )

  return (
    <div className="admin admin-shell">
      {/* Barra superior (solo móvil) */}
      <header className="admin-topbar">
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menú del panel">
          <Icon name="menu" />
        </button>
        {logo}
        <ThemePicker className="on-dark" />
      </header>

      <div className={`drawer-backdrop admin-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`admin-sidebar ${menuOpen ? 'show' : ''}`} aria-label="Menú del panel">
        <div className="admin-sidebar-head">
          {logo}
          <button className="icon-btn admin-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <Icon name="close" />
          </button>
        </div>

        {/* En móvil, el menú se cierra al elegir una opción */}
        <nav className="admin-menu" onClick={(e) => (e.target as Element).closest('a') && setMenuOpen(false)}>
          <p className="admin-menu-label">Gestión</p>
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={() => `admin-menu-link ${item.isActive(pathname) ? 'active' : ''}`}
            >
              <Icon name={item.icon} size={19} /> {item.label}
            </NavLink>
          ))}

          <p className="admin-menu-label">Tienda</p>
          <Link to="/" className="admin-menu-link">
            <Icon name="cart" size={19} /> Ver tienda
          </Link>
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-user" title={session?.username}>
            <span className="admin-avatar" aria-hidden="true">{session?.name.charAt(0)}</span>
            <div>
              <strong>{session?.name}</strong>
              <span>{session?.username}</span>
            </div>
            <ThemePicker className="on-dark admin-sidebar-theme" />
          </div>
          <button className="admin-logout" onClick={onLogout}>
            <Icon name="logout" size={17} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
