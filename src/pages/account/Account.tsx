import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'
import './account.css'

// Página "Mi cuenta": datos del cliente y cierre de sesión.
export default function Account() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  if (!session) return <Navigate to="/cuenta/ingresar" replace state={{ from: '/cuenta' }} />

  const onLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1>Mi cuenta</h1>
        <div className="account-profile">
          <span className="account-avatar" aria-hidden="true">{session.name.charAt(0)}</span>
          <div>
            <strong>{session.name}</strong>
            <span className="muted small">{session.username}</span>
          </div>
        </div>
        <div className="account-actions">
          {session.role === 'ADMIN' && (
            <Link to="/admin" className="btn btn-primary">
              <Icon name="gear" size={18} /> Panel de administración
            </Link>
          )}
          <Link to="/" className="btn btn-ghost">
            <Icon name="cart" size={18} /> Seguir comprando
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
