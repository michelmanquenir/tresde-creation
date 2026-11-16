import { useEffect, useState, type FormEvent } from 'react'
import { accessoriesApi, type Accessory } from '../api/accessories'
import { ApiError } from '../api/client'
import Icon from '../components/Icon'

const SUGGESTIONS = ['Argolla de llavero', 'Mecanismo de clicker', 'Imán', 'Cadena', 'Mosquetón']

type Draft = { name: string; cost: string }

// Catálogo de accesorios: se crean una vez aquí y luego se eligen en cada producto
export default function AdminAccessories() {
  const [list, setList] = useState<Accessory[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    accessoriesApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los accesorios.'))
  }, [])

  const sorted = (l: Accessory[]) => [...l].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const failed = (e: unknown, fallback: string) => {
    if (e instanceof ApiError) {
      const field = Object.values(e.fieldErrors)[0]
      setError(field ?? e.message)
    } else setError(fallback)
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!name.trim()) return setError('Escribe el nombre del accesorio.')
    if (cost.trim() === '' || Number(cost) < 0) return setError('Indica cuánto te cuesta cada unidad.')
    setSaving(true)
    try {
      const created = await accessoriesApi.create({ name: name.trim(), cost: Math.round(Number(cost)) })
      setList((prev) => sorted([...(prev ?? []), created]))
      setNotice(`Se agregó “${created.name}”. Ya puedes elegirlo en tus productos.`)
      setName('')
      setCost('')
    } catch (err) {
      failed(err, 'No se pudo agregar el accesorio.')
    } finally {
      setSaving(false)
    }
  }

  const onSave = async (a: Accessory) => {
    const d = drafts[a.id]
    if (!d) return
    setError('')
    setNotice('')
    setBusyId(a.id)
    try {
      const updated = await accessoriesApi.update(a.id, { name: d.name.trim(), cost: Math.round(Number(d.cost) || 0) })
      setList((prev) => sorted((prev ?? []).map((x) => (x.id === a.id ? updated : x))))
      setDrafts(({ [a.id]: _done, ...rest }) => rest)
      setNotice(
        updated.usedBy
          ? `Se guardó “${updated.name}”. Se actualizó el costo de ${updated.usedBy} ${updated.usedBy === 1 ? 'producto' : 'productos'}.`
          : `Se guardó “${updated.name}”.`,
      )
    } catch (err) {
      failed(err, 'No se pudo guardar.')
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (a: Accessory) => {
    const msg = a.usedBy
      ? `“${a.name}” está en ${a.usedBy} ${a.usedBy === 1 ? 'producto' : 'productos'}. Si lo eliminas, se quitará de ${a.usedBy === 1 ? 'él' : 'ellos'} y bajará su costo. ¿Continuar?`
      : `¿Eliminar “${a.name}”?`
    if (!confirm(msg)) return
    setError('')
    setNotice('')
    setBusyId(a.id)
    try {
      await accessoriesApi.remove(a.id)
      setList((prev) => (prev ?? []).filter((x) => x.id !== a.id))
    } catch (err) {
      failed(err, 'No se pudo eliminar.')
    } finally {
      setBusyId(null)
    }
  }

  const draftOf = (a: Accessory): Draft => drafts[a.id] ?? { name: a.name, cost: String(a.cost) }
  const setDraft = (a: Accessory, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [a.id]: { ...draftOf(a), ...patch } }))
  const isDirty = (a: Accessory) => {
    const d = drafts[a.id]
    return !!d && (d.name.trim() !== a.name || Number(d.cost) !== a.cost)
  }

  const missing = SUGGESTIONS.filter((s) => !(list ?? []).some((a) => a.name.toLowerCase() === s.toLowerCase()))

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Accesorios</h1>
          <p className="muted">Argollas, mecanismos de clicker, imanes… Créalos una vez y elígelos en cada producto.</p>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <form className="panel acc-new" onSubmit={onCreate} noValidate>
        <h2 className="legend">Nuevo accesorio</h2>
        <div className="acc-new-row">
          <label className="field">
            Nombre
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ej: Argolla de llavero" />
          </label>
          <label className="field">
            <span>Costo por unidad <span className="muted small">($)</span></span>
            <input type="number" min={0} step={1} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Ej: 30" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="plus" size={18} /> {saving ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
        {missing.length > 0 && (
          <div className="acc-suggest">
            <span className="muted small">Ideas:</span>
            {missing.map((s) => (
              <button key={s} type="button" className="chip sm" onClick={() => setName(s)}>{s}</button>
            ))}
          </div>
        )}
      </form>

      <section className="panel">
        <h2 className="legend">Tus accesorios</h2>
        {!list ? (
          <p className="muted small">Cargando…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <Icon name="key" size={36} />
            <p className="muted">Aún no tienes accesorios. Agrega el primero arriba.</p>
          </div>
        ) : (
          <div className="acc-table" role="table" aria-label="Accesorios">
            <div className="acc-row acc-row-head" role="row">
              <span role="columnheader">Nombre</span>
              <span role="columnheader">Costo c/u</span>
              <span role="columnheader">Se usa en</span>
              <span role="columnheader" />
            </div>
            {list.map((a) => {
              const d = draftOf(a)
              return (
                <div key={a.id} className="acc-row" role="row">
                  <span role="cell">
                    <input value={d.name} maxLength={80} onChange={(e) => setDraft(a, { name: e.target.value })} aria-label="Nombre" />
                  </span>
                  <span role="cell" className="acc-cost">
                    <span className="muted">$</span>
                    <input type="number" min={0} step={1} inputMode="numeric" value={d.cost} onChange={(e) => setDraft(a, { cost: e.target.value })} aria-label="Costo por unidad" />
                  </span>
                  <span role="cell" className="muted small">
                    {a.usedBy ? `${a.usedBy} ${a.usedBy === 1 ? 'producto' : 'productos'}` : 'Ningún producto'}
                  </span>
                  <span role="cell" className="acc-actions">
                    {isDirty(a) && (
                      <button type="button" className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => onSave(a)}>
                        Guardar
                      </button>
                    )}
                    <button type="button" className="icon-btn danger" disabled={busyId === a.id} onClick={() => onDelete(a)} title="Eliminar" aria-label={`Eliminar ${a.name}`}>
                      <Icon name="trash" size={17} />
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {list && list.length > 0 && (
          <p className="muted small">
            Si cambias un costo, se actualiza en todos los productos que lo usan. Las ventas ya registradas conservan el costo de ese momento.
          </p>
        )}
      </section>
    </>
  )
}
