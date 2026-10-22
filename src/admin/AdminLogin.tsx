import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { STORE_NAME } from '../data/catalog'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import './admin.css'

export default function AdminLogin() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (session) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(username, password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="logo login-logo">
          <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
          {STORE_NAME}
        </Link>
        <h1>Panel de administración</h1>
        <p className="muted">Ingresa para gestionar los productos de la tienda.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <form onSubmit={onSubmit} className="login-form" noValidate>
          <label className="field">
            Usuario
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </label>
          <label className="field">
            Contraseña
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Mantener sesión iniciada</span>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="login-hint muted small">
          Acceso de prueba: <code>admin</code> / <code>admin</code>
        </p>
        <Link to="/" className="back-link login-back"><Icon name="back" size={16} /> Volver a la tienda</Link>
      </div>
    </div>
  )
}
