import { useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { categories, STORE_NAME } from '../data/catalog'
import { useCart } from '../context/CartContext'
import Icon from './Icon'

export default function Navbar() {
  const { count, open } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="site-header">
      <div className="announce">
        Envíos a todo el país · Pedidos personalizados desde tu archivo STL
      </div>

      <div className="nav-main container">
        <button
          className="icon-btn only-mobile"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>

        <Link to="/" className="logo" aria-label={`${STORE_NAME}, inicio`}>
          <span className="logo-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          {STORE_NAME}
        </Link>

        <form className="search" onSubmit={onSearch} role="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Buscar dragones, macetas, soportes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar productos"
          />
        </form>

        <div className="nav-actions">
          <NavLink to="/personalizado" className="nav-link hide-mobile">
            Pedido a medida
          </NavLink>
          <button className="icon-btn cart-btn" onClick={open} aria-label={`Carrito, ${count} productos`}>
            <Icon name="cart" />
            {count > 0 && <span className="badge">{count}</span>}
          </button>
        </div>
      </div>

      <nav className="nav-categories hide-mobile" aria-label="Categorías">
        <div className="container cat-row">
          <NavLink to="/categoria/todos" className="cat-link">Todos</NavLink>
          {categories.map((c) => (
            <NavLink key={c.slug} to={`/categoria/${c.slug}`} className="cat-link">
              <Icon name={c.icon} size={16} />
              {c.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Menú móvil */}
      <div className={`drawer-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`drawer drawer-left ${menuOpen ? 'show' : ''}`} aria-hidden={!menuOpen}>
        <div className="drawer-head">
          <span className="logo">{STORE_NAME}</span>
          <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <Icon name="close" />
          </button>
        </div>
        <p className="drawer-label">Categorías</p>
        <NavLink to="/categoria/todos" className="drawer-link" onClick={() => setMenuOpen(false)}>
          <Icon name="layers" /> Todos los productos
        </NavLink>
        {categories.map((c) => (
          <NavLink key={c.slug} to={`/categoria/${c.slug}`} className="drawer-link" onClick={() => setMenuOpen(false)}>
            <Icon name={c.icon} /> {c.name}
          </NavLink>
        ))}
        <NavLink to="/personalizado" className="drawer-link accent" onClick={() => setMenuOpen(false)}>
          <Icon name="upload" /> Pedido a medida
        </NavLink>
      </aside>
    </header>
  )
}
