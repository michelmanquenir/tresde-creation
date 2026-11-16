import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import { canUsePanel, type Role } from '../../auth/authService'
import PasswordInput from '../../components/PasswordInput'
import '../../admin/admin.css'
import './account.css'

type Errors = Partial<Record<'username' | 'password', string>>

// Inicio de sesión. No hay registro público: las cuentas las crea el administrador en el panel (Usuarios).
export default function AccountAuth() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/cuenta'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Administradores y trabajadores van directo al panel
  const destination = (role: Role) => (canUsePanel(role) && !from.startsWith('/admin') ? '/admin' : from)

  if (session) return <Navigate to={destination(session.role)} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!username.trim()) found.username = 'Ingresa tu usuario o correo.'
    if (!password) found.password = 'Ingresa tu contraseña.'
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      const s = await login(username, password, remember)
      navigate(destination(s.role), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors as Errors)
        setError(err.message)
      } else {
        setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1>Iniciar sesión</h1>
        <p className="muted">Ingresa con el usuario y la contraseña que te entregó el administrador.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <form onSubmit={onSubmit} className="account-form" noValidate>
          <label className="field">
            Usuario o correo
            <input
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </label>
          <label className="field">
            Contraseña
            <PasswordInput
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={72}
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <label className="toggle">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Mantener sesión iniciada</span>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="account-switch muted small">¿No tienes cuenta? Pídele una al administrador de la tienda.</p>
      </div>
    </div>
  )
}
