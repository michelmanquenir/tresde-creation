import { useState, type FormEvent } from 'react'
import type { Product } from '../data/catalog'
import { deliveriesApi, type Delivery, type Recipient } from '../api/deliveries'
import { ApiError } from '../api/client'
import { ROLE_LABEL } from '../auth/authService'
import Icon from '../components/Icon'

type Props = {
  products: Product[]
  recipients: Recipient[]
  onSaved: (delivery: Delivery) => void
  onCancel: () => void
}

type Line = { key: number; productId: string; quantity: string }

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11-14" → fecha ISO. Hoy usa la hora actual; otro día, el mediodía (evita saltos por zona horaria). */
const toDeliveredAt = (value: string) => {
  if (!value || value === today()) return undefined
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toISOString()
}

let nextKey = 1
const newLine = (): Line => ({ key: nextKey++, productId: '', quantity: '1' })

// Formulario para registrar una entrega de inventario (uno o varios productos)
export default function DeliveryForm({ products, recipients, onSaved, onCancel }: Props) {
  const [recipient, setRecipient] = useState(recipients.length === 1 ? recipients[0].username : '')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const qtyOf = (l: Line) => Math.max(0, Math.floor(Number(l.quantity) || 0))
  const total = lines.reduce((sum, l) => sum + (l.productId ? qtyOf(l) : 0), 0)

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!recipient) errs.recipientUsername = 'Elige a quién le entregas.'
    const filled = lines.filter((l) => l.productId)
    if (filled.length === 0) errs.items = 'Agrega al menos un producto.'
    else if (filled.some((l) => qtyOf(l) < 1)) errs.items = 'Cada producto debe tener al menos 1 unidad.'
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const saved = await deliveriesApi.create({
        recipientUsername: recipient,
        deliveredAt: toDeliveredAt(date),
        note: note.trim() || undefined,
        items: filled.map((l) => ({ productId: l.productId, quantity: qtyOf(l) })),
      })
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setError(err.message)
      } else setError('No se pudo registrar la entrega.')
      setSaving(false)
    }
  }

  return (
    <form className="panel delivery-form" onSubmit={onSubmit} noValidate>
      <div className="sale-form-head">
        <h2 className="legend">Nueva entrega</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
      {error && <div className="alert">{error}</div>}

      {recipients.length === 0 ? (
        <p className="muted">No hay otros usuarios en el panel. Crea un usuario en “Usuarios” para poder entregarle inventario.</p>
      ) : (
        <>
          <div className="field-row">
            <label className="field">
              Entregar a *
              <select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">Elige un usuario…</option>
                {recipients.map((r) => (
                  <option key={r.username} value={r.username}>
                    {r.name} · {ROLE_LABEL[r.role]}
                  </option>
                ))}
              </select>
              {errors.recipientUsername && <span className="field-error">{errors.recipientUsername}</span>}
            </label>
            <label className="field">
              Fecha de entrega
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              {errors.deliveredAt && <span className="field-error">{errors.deliveredAt}</span>}
            </label>
          </div>

          <div className="field">
            Detalle *
            <div className="delivery-lines">
              {lines.map((l) => (
                <div key={l.key} className="delivery-line">
                  <select value={l.productId} onChange={(e) => setLine(l.key, { productId: e.target.value })} aria-label="Producto">
                    <option value="">Elige un producto…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.stock} en stock
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={l.quantity}
                    onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                    aria-label="Cantidad"
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    aria-label="Quitar producto"
                    title="Quitar"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="color-add" onClick={() => setLines((prev) => [...prev, newLine()])}>
              <Icon name="plus" size={16} /> Agregar otro producto
            </button>
            {errors.items && <span className="field-error">{errors.items}</span>}
          </div>

          <label className="field">
            <span>Comentario <span className="muted small">(opcional)</span></span>
            <textarea rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ej: van en la caja azul, 2 tienen detalles en la argolla" />
          </label>

          <div className="delivery-form-foot">
            <span className="muted">
              {total > 0 ? `${total} ${total === 1 ? 'unidad' : 'unidades'} en total` : 'Sin productos aún'}
              {' · '}el stock se suma cuando la acepten
            </span>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Icon name="truck" size={18} /> {saving ? 'Registrando…' : 'Registrar entrega'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
