import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import type { Role } from '../../auth/authService'
import PasswordInput from '../../components/PasswordInput'
import '../../admin/admin.css'
import './account.css'

type Mode = 'login' | 'register'
type Errors = Partial<Record<'name' | 'email' | 'password', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Inicio de sesión y registro de clientes de la tienda.
export default function AccountAuth({ mode }: { mode: Mode }) {
  const { session, login, register } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/cuenta'
  const isRegister = mode === 'register'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // El administrador va directo al panel; el cliente vuelve a donde estaba (o a "Mi cuenta")
  const destination = (role: Role) => (role === 'ADMIN' && !from.startsWith('/admin') ? '/admin' : from)

  if (session) return <Navigate to={destination(session.role)} replace />

  const validate = (): Errors => {
    const e: Errors = {}
    if (isRegister && !name.trim()) e.name = 'Ingresa tu nombre.'
    if (!email.trim()) e.email = 'Ingresa tu correo.'
    else if (isRegister && !EMAIL_RE.test(email.trim())) e.email = 'Ingresa un correo válido.'
    if (!password) e.password = 'Ingresa tu contraseña.'
    else if (isRegister && password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres.'
    return e
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      const s = isRegister
        ? await register(name, email, password, remember)
        : await login(email, password, remember)
      navigate(destination(s.role), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors as Errors)
        setError(err.message)
      } else {
        setError('No se pudo completar la operación. Inténtalo de nuevo.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p className="muted">
          {isRegister ? 'Regístrate para comprar más rápido y seguir tus pedidos.' : 'Ingresa con tu correo y contraseña.'}
        </p>

        {error && <div className="alert" role="alert">{error}</div>}

        <form onSubmit={onSubmit} className="account-form" noValidate>
          {isRegister && (
            <label className="field">
              Nombre
              <input
                autoFocus
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
          )}
          <label className="field">
            Correo
            <input
              type="email"
              autoFocus={!isRegister}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label className="field">
            Contraseña
            <PasswordInput
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Mínimo 8 caracteres' : '••••••••'}
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
            {loading ? (isRegister ? 'Creando cuenta…' : 'Ingresando…') : isRegister ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>

        <p className="account-switch muted small">
          {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
          <Link to={isRegister ? '/cuenta/ingresar' : '/cuenta/registro'} state={{ from }} replace>
            {isRegister ? 'Inicia sesión' : 'Crea una aquí'}
          </Link>
        </p>
      </div>
    </div>
  )
}
