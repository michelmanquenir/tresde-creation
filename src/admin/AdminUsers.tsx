import { useEffect, useState, type FormEvent } from 'react'
import { usersApi, type PanelUser, type UserInput } from '../api/users'
import { ApiError } from '../api/client'
import { ROLE_LABEL } from '../auth/authService'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import Icon from '../components/Icon'

type PanelRole = UserInput['role']
type Errors = Partial<Record<'name' | 'username' | 'password' | 'role', string>>
type Draft = { name: string; role: PanelRole; password: string }

const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

const ROLE_HELP: Record<PanelRole, string> = {
  STAFF: 'Productos, stock, ventas y accesorios. No ve Usuarios ni cambia la Configuración.',
  ADMIN: 'Acceso completo, incluido crear usuarios y cambiar la configuración.',
  SELLER: 'Solo registra ventas a precio de catálogo y ve las suyas. No ve costos, ganancias ni el resto del panel.',
}

// Usuarios del panel: el administrador crea las cuentas de sus trabajadores (no hay registro público)
export default function AdminUsers() {
  const { session } = useAuth()
  const [list, setList] = useState<PanelUser[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<PanelRole>('STAFF')
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<{ id: number; draft: Draft; errors: Errors } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    usersApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.'))
  }, [])

  const isSelf = (u: PanelUser) => u.username.toLowerCase() === session?.username.toLowerCase()
  const reset = () => {
    setError('')
    setNotice('')
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    reset()
    const found: Errors = {}
    if (!name.trim()) found.name = 'Ingresa el nombre.'
    if (!username.trim()) found.username = 'Ingresa el nombre de usuario.'
    else if (/\s/.test(username.trim())) found.username = 'Sin espacios. Ej: pedro o pedro@correo.com'
    if (password.length < 8) found.password = 'Mínimo 8 caracteres.'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      const created = await usersApi.create({ name: name.trim(), username: username.trim(), password, role })
      setList((prev) => [...(prev ?? []), created])
      setNotice(`Se creó la cuenta de ${created.name}. Entrégale su usuario “${created.username}” y la contraseña.`)
      setName('')
      setUsername('')
      setPassword('')
      setRole('STAFF')
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors as Errors)
        if (!Object.keys(err.fieldErrors).length) setError(err.message)
      } else setError('No se pudo crear el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (u: PanelUser) => {
    reset()
    setEditing({ id: u.id, draft: { name: u.name, role: u.role === 'ADMIN' || u.role === 'SELLER' ? u.role : 'STAFF', password: '' }, errors: {} })
  }
  const patch = (p: Partial<Draft>) => setEditing((ed) => (ed ? { ...ed, draft: { ...ed.draft, ...p } } : ed))

  const onSave = async (u: PanelUser) => {
    if (!editing) return
    reset()
    const { draft } = editing
    const found: Errors = {}
    if (!draft.name.trim()) found.name = 'Ingresa el nombre.'
    if (draft.password && draft.password.length < 8) found.password = 'Mínimo 8 caracteres.'
    if (Object.keys(found).length) return setEditing({ ...editing, errors: found })

    setBusyId(u.id)
    try {
      const updated = await usersApi.update(u.id, {
        name: draft.name.trim(),
        role: draft.role,
        password: draft.password || undefined,
      })
      setList((prev) => (prev ?? []).map((x) => (x.id === u.id ? updated : x)))
      setEditing(null)
      setNotice(
        draft.password
          ? `Se guardó ${updated.name}. Su contraseña cambió y se cerraron sus sesiones abiertas.`
          : `Se guardó ${updated.name}.`,
      )
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setEditing({ ...editing, errors: err.fieldErrors as Errors })
      } else setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (u: PanelUser) => {
    if (!confirm(`¿Eliminar la cuenta de ${u.name} (${u.username})? Ya no podrá entrar al panel.`)) return
    reset()
    setBusyId(u.id)
    try {
      await usersApi.remove(u.id)
      setList((prev) => (prev ?? []).filter((x) => x.id !== u.id))
      setNotice(`Se eliminó la cuenta de ${u.name}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Usuarios</h1>
          <p className="muted">Crea las cuentas de tus trabajadores. Nadie más puede registrarse en la tienda.</p>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <form className="panel user-new" onSubmit={onCreate} noValidate>
        <h2 className="legend">Nuevo usuario</h2>
        <div className="user-new-grid">
          <label className="field">
            Nombre
            <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pedro Soto" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field">
            Usuario <span className="muted small">(con esto inicia sesión)</span>
            <input
              value={username}
              maxLength={255}
              autoCapitalize="none"
              autoComplete="off"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: pedro"
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </label>
          <label className="field">
            Contraseña
            <PasswordInput
              value={password}
              maxLength={72}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <label className="field">
            Rol
            <select value={role} onChange={(e) => setRole(e.target.value as PanelRole)}>
              <option value="STAFF">{ROLE_LABEL.STAFF}</option>
              <option value="SELLER">{ROLE_LABEL.SELLER}</option>
              <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
            </select>
          </label>
        </div>
        <p className="muted small field-hint">{ROLE_HELP[role]}</p>
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="plus" size={18} /> {saving ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>

      <section className="panel">
        <h2 className="legend">Cuentas</h2>
        {!list ? (
          <p className="muted small">Cargando…</p>
        ) : (
          <ul className="user-list">
            {list.map((u) => {
              const ed = editing?.id === u.id ? editing : null
              return (
                <li key={u.id} className={`user-item ${ed ? 'is-editing' : ''}`}>
                  <div className="user-main">
                    <span className="admin-avatar" aria-hidden="true">{u.name.charAt(0)}</span>
                    <div className="user-info">
                      <strong>
                        {u.name} {isSelf(u) && <span className="muted small">(tú)</span>}
                      </strong>
                      <span className="muted small">
                        {u.username} · desde {dateFmt.format(new Date(u.createdAt))}
                      </span>
                    </div>
                    <span className={`tag ${u.role === 'ADMIN' ? 'tag-admin' : u.role === 'STAFF' ? 'tag-staff' : u.role === 'SELLER' ? 'tag-seller' : ''}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    <div className="user-actions">
                      {!ed && (
                        <button type="button" className="icon-btn" onClick={() => startEdit(u)} title="Editar" aria-label={`Editar ${u.name}`}>
                          <Icon name="edit" size={17} />
                        </button>
                      )}
                      {!isSelf(u) && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          disabled={busyId === u.id}
                          onClick={() => onDelete(u)}
                          title="Eliminar"
                          aria-label={`Eliminar ${u.name}`}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      )}
                    </div>
                  </div>

                  {ed && (
                    <div className="user-edit">
                      <label className="field">
                        Nombre
                        <input value={ed.draft.name} maxLength={100} onChange={(e) => patch({ name: e.target.value })} />
                        {ed.errors.name && <span className="field-error">{ed.errors.name}</span>}
                      </label>
                      <label className="field">
                        Rol
                        <select
                          value={ed.draft.role}
                          disabled={isSelf(u)}
                          onChange={(e) => patch({ role: e.target.value as PanelRole })}
                          title={isSelf(u) ? 'No puedes quitarte el rol de administrador' : undefined}
                        >
                          <option value="STAFF">{ROLE_LABEL.STAFF}</option>
                          <option value="SELLER">{ROLE_LABEL.SELLER}</option>
                          <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
                        </select>
                      </label>
                      <label className="field">
                        Nueva contraseña <span className="muted small">(opcional)</span>
                        <PasswordInput
                          value={ed.draft.password}
                          maxLength={72}
                          autoComplete="new-password"
                          onChange={(e) => patch({ password: e.target.value })}
                          placeholder="Déjala vacía para no cambiarla"
                        />
                        {ed.errors.password && <span className="field-error">{ed.errors.password}</span>}
                      </label>
                      <div className="user-edit-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                          Cancelar
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busyId === u.id} onClick={() => onSave(u)}>
                          {busyId === u.id ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                      {isSelf(u) && ed.draft.password && (
                        <p className="muted small">Al cambiar tu contraseña tendrás que volver a iniciar sesión.</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
