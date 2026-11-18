import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { categoriesApi, CATEGORY_ICONS, type AdminCategory, type CategoryInput } from '../api/categories'
import { ApiError } from '../api/client'
import { useCategories } from '../context/CategoriesContext'
import Icon from '../components/Icon'

type Errors = Partial<Record<keyof CategoryInput, string>>

const EMPTY: CategoryInput = { name: '', description: '', icon: 'star', hue: 200 }

/** Nombre, descripción, icono y color de una categoría (se usa para crear y para editar). */
function CategoryFields({ value, errors, onChange }: { value: CategoryInput; errors: Errors; onChange: (v: CategoryInput) => void }) {
  const set = <K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) => onChange({ ...value, [k]: v })
  return (
    <>
      <div className="field-row">
        <label className="field">
          Nombre *
          <input value={value.name} maxLength={80} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Navidad" />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className="field">
          Descripción <span className="muted small">(se muestra en la tienda)</span>
          <input
            value={value.description}
            maxLength={255}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Ej: Adornos y regalos para estas fiestas."
          />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </label>
      </div>
      <div className="field-row">
        <div className="field">
          <span>Icono</span>
          <div className="icon-grid" role="radiogroup" aria-label="Icono">
            {CATEGORY_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={value.icon === name}
                aria-label={name}
                className={`icon-choice ${value.icon === name ? 'active' : ''}`}
                onClick={() => set('icon', name)}
              >
                <Icon name={name} size={18} />
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Color <span className="muted small">(fondo de los productos sin foto)</span></span>
          <div className="hue-row">
            <input type="range" min={0} max={359} value={value.hue} onChange={(e) => set('hue', Number(e.target.value))} className="hue-range" />
            <span className="cat-swatch" style={{ '--hue': value.hue } as CSSProperties}>
              <Icon name={value.icon} size={18} />
            </span>
          </div>
        </label>
      </div>
    </>
  )
}

// Mantenedor de categorías: crear, editar, ordenar (como aparecen en el menú de la tienda) y eliminar
export default function AdminCategories() {
  const { reload: reloadStore } = useCategories()
  const [list, setList] = useState<AdminCategory[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<CategoryInput>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<{ slug: string; value: CategoryInput; errors: Errors } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    categoriesApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las categorías.'))
  }, [])

  const reset = () => {
    setError('')
    setNotice('')
  }
  const fieldErrors = (err: unknown): Errors | null =>
    err instanceof ApiError && Object.keys(err.fieldErrors).length ? (err.fieldErrors as Errors) : null
  const clean = (v: CategoryInput): CategoryInput => ({ ...v, name: v.name.trim(), description: v.description.trim() })

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    reset()
    if (!draft.name.trim()) return setErrors({ name: 'Escribe el nombre.' })
    setErrors({})
    setSaving(true)
    try {
      const created = await categoriesApi.create(clean(draft))
      setList((prev) => [...(prev ?? []), created])
      setDraft(EMPTY)
      setNotice(`Se creó “${created.name}”. Ya aparece en la tienda y puedes asignarla a tus productos.`)
      reloadStore()
    } catch (err) {
      const fe = fieldErrors(err)
      if (fe) setErrors(fe)
      else setError(err instanceof Error ? err.message : 'No se pudo crear la categoría.')
    } finally {
      setSaving(false)
    }
  }

  const onSave = async () => {
    if (!editing) return
    reset()
    if (!editing.value.name.trim()) return setEditing({ ...editing, errors: { name: 'Escribe el nombre.' } })
    setBusy(editing.slug)
    try {
      const updated = await categoriesApi.update(editing.slug, clean(editing.value))
      setList((prev) => (prev ?? []).map((c) => (c.slug === updated.slug ? updated : c)))
      setEditing(null)
      setNotice(`Se guardó “${updated.name}”.`)
      reloadStore()
    } catch (err) {
      const fe = fieldErrors(err)
      if (fe) setEditing({ ...editing, errors: fe })
      else setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setBusy(null)
    }
  }

  const move = async (index: number, delta: number) => {
    if (!list) return
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    reset()
    setList(next) // se ve al instante; si falla, se recarga
    setBusy(item.slug)
    try {
      setList(await categoriesApi.reorder(next.map((c) => c.slug)))
      reloadStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el orden.')
      categoriesApi.list().then(setList).catch(() => {})
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async (c: AdminCategory) => {
    const msg = c.products
      ? `“${c.name}” está en ${c.products} ${c.products === 1 ? 'producto' : 'productos'}. Se quitará de ${c.products === 1 ? 'él' : 'ellos'} (seguirán en sus otras categorías). ¿Eliminarla?`
      : `¿Eliminar “${c.name}”?`
    if (!confirm(msg)) return
    reset()
    setBusy(c.slug)
    try {
      await categoriesApi.remove(c.slug)
      setList((prev) => (prev ?? []).filter((x) => x.slug !== c.slug))
      setNotice(`Se eliminó “${c.name}”.`)
      reloadStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Categorías</h1>
          <p className="muted">Aparecen en el menú de la tienda en este orden. Un producto puede estar en varias.</p>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <form className="panel cat-new" onSubmit={onCreate} noValidate>
        <h2 className="legend">Nueva categoría</h2>
        <CategoryFields value={draft} errors={errors} onChange={setDraft} />
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="plus" size={18} /> {saving ? 'Creando…' : 'Crear categoría'}
          </button>
        </div>
      </form>

      <section className="panel">
        <h2 className="legend">Tus categorías</h2>
        {!list ? (
          <p className="muted small">Cargando…</p>
        ) : (
          <ul className="cat-list">
            {list.map((c, i) => {
              const ed = editing?.slug === c.slug ? editing : null
              return (
                <li key={c.slug} className="cat-item">
                  <div className="cat-main">
                    <div className="cat-order">
                      <button type="button" className="icon-btn" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label={`Subir ${c.name}`} title="Subir">
                        <Icon name="chevron" size={16} className="flip" />
                      </button>
                      <button type="button" className="icon-btn" disabled={i === list.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label={`Bajar ${c.name}`} title="Bajar">
                        <Icon name="chevron" size={16} />
                      </button>
                    </div>
                    <span className="cat-swatch" style={{ '--hue': c.hue } as CSSProperties}>
                      <Icon name={c.icon} size={18} />
                    </span>
                    <div className="cat-info">
                      <strong>{c.name}</strong>
                      <span className="muted small">{c.description || 'Sin descripción'}</span>
                    </div>
                    <Link to={`/admin/productos?categoria=${c.slug}`} className="muted small cat-count">
                      {c.products} {c.products === 1 ? 'producto' : 'productos'}
                    </Link>
                    <div className="cat-actions">
                      {!ed && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            reset()
                            setEditing({ slug: c.slug, value: { name: c.name, description: c.description, icon: c.icon, hue: c.hue }, errors: {} })
                          }}
                          title="Editar"
                          aria-label={`Editar ${c.name}`}
                        >
                          <Icon name="edit" size={17} />
                        </button>
                      )}
                      <button type="button" className="icon-btn danger" disabled={busy === c.slug} onClick={() => onDelete(c)} title="Eliminar" aria-label={`Eliminar ${c.name}`}>
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </div>
                  {ed && (
                    <div className="cat-edit">
                      <CategoryFields value={ed.value} errors={ed.errors} onChange={(value) => setEditing({ ...ed, value })} />
                      <div className="cat-edit-actions">
                        <span className="muted small">Dirección en la tienda: /categoria/{c.slug}</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy === c.slug} onClick={onSave}>
                          {busy === c.slug ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
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
