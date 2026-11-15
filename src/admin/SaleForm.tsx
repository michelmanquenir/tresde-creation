import { useState, type FormEvent } from 'react'
import { formatPrice, type Product } from '../data/catalog'
import { CHANNELS, salesApi, type Sale } from '../api/sales'
import { ApiError } from '../api/client'
import { computeCost, formatCost, saleSummary, type CostSettings } from '../utils/pricing'

type Props = {
  products: Product[]
  settings: CostSettings | null
  initialProductId?: string
  onSaved: (sale: Sale) => void
  onCancel: () => void
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11-14" → fecha ISO. Hoy usa la hora actual; otro día, el mediodía (evita saltos por zona horaria). */
const toSoldAt = (value: string) => {
  if (!value || value === today()) return undefined
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toISOString()
}

// Formulario para registrar una venta hecha fuera de la web (o confirmar una de la web)
export default function SaleForm({ products, settings, initialProductId, onSaved, onCancel }: Props) {
  const initial = products.find((p) => p.id === initialProductId)
  const [productId, setProductId] = useState(initial?.id ?? '')
  const [color, setColor] = useState(initial?.colors[0] ?? '')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState(initial ? String(initial.price) : '')
  const [channel, setChannel] = useState<string>('WhatsApp')
  const [customer, setCustomer] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const product = products.find((p) => p.id === productId)
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  const price = Number(unitPrice) || 0
  const total = qty * price
  const cost = product && settings ? computeCost(product.cost, product.material, settings) : null
  const sale = cost && settings && price > 0 ? saleSummary(price, cost.total, settings) : null
  const overStock = !!product && qty > product.stock

  const pickProduct = (id: string) => {
    const p = products.find((x) => x.id === id)
    setProductId(id)
    setColor(p?.colors[0] ?? '')
    setUnitPrice(p ? String(p.price) : '')
    setErrors({})
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!product) errs.productId = 'Elige el producto vendido.'
    if (qty < 1) errs.quantity = 'La cantidad mínima es 1.'
    if (!(price > 0)) errs.unitPrice = 'El precio debe ser mayor a 0.'
    if (overStock) errs.quantity = `Solo quedan ${product!.stock} en stock.`
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const saved = await salesApi.create({
        productId,
        color: color || undefined,
        quantity: qty,
        unitPrice: price,
        channel,
        customer: customer.trim() || undefined,
        note: note.trim() || undefined,
        soldAt: toSoldAt(date),
      })
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setError(err.message)
      } else setError('No se pudo registrar la venta.')
      setSaving(false)
    }
  }

  return (
    <form className="panel sale-form" onSubmit={onSubmit} noValidate>
      <div className="sale-form-head">
        <h2 className="legend">Registrar venta</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="sale-form-grid">
        <div className="sale-form-fields">
          <label className="field">
            Producto *
            <select value={productId} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">Elige un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatPrice(p.price)} · {p.stock ? `${p.stock} en stock` : 'sin stock'}
                </option>
              ))}
            </select>
            {errors.productId && <span className="field-error">{errors.productId}</span>}
          </label>

          {product && product.colors.length > 1 && (
            <div className="field">
              Color
              <div className="swatches">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch lg ${c === color ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    aria-pressed={c === color}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="field-row">
            <label className="field">
              Cantidad *
              <input type="number" min={1} step={1} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              {errors.quantity && <span className="field-error">{errors.quantity}</span>}
            </label>
            <label className="field">
              <span>Precio unitario * <span className="muted small">(con descuento, si hubo)</span></span>
              <input type="number" min={0} step={10} inputMode="numeric" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              {errors.unitPrice && <span className="field-error">{errors.unitPrice}</span>}
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              Fecha
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              Canal
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Cliente <span className="muted small">(opcional)</span></span>
              <input value={customer} maxLength={120} onChange={(e) => setCustomer(e.target.value)} placeholder="Ej: Camila R." />
            </label>
            <label className="field">
              <span>Nota <span className="muted small">(opcional)</span></span>
              <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ej: retiro en metro" />
            </label>
          </div>

          {product && (
            <p className={`stock-msg ${product.stock === 0 ? 'is-out' : ''}`}>
              {product.stock === 0
                ? 'Este producto no tiene stock. Si imprimiste más unidades, súmalas al stock antes de registrar la venta.'
                : `Stock: ${product.stock} → ${Math.max(0, product.stock - qty)} después de esta venta`}
            </p>
          )}
        </div>

        <aside className="sale-form-summary">
          <dl className="cost-lines">
            <div><dt>Total de la venta</dt><dd><strong>{formatPrice(total)}</strong></dd></div>
            {sale && cost ? (
              <>
                <div><dt>Costo ({qty} × {formatCost(cost.total)})</dt><dd>−{formatCost(cost.total * qty)}</dd></div>
                <div><dt>Para la máquina ({settings?.machineReservePercent}%)</dt><dd>−{formatCost(sale.reserve * qty)}</dd></div>
                <div className={`cost-total ${sale.profit < 0 ? 'is-loss' : ''}`}>
                  <dt>Ganancia</dt><dd>{formatCost(sale.profit * qty)}</dd>
                </div>
              </>
            ) : (
              product && <p className="muted small">Este producto no tiene costos cargados: la venta se registra, pero sin ganancia calculada.</p>
            )}
          </dl>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving || !product}>
            {saving ? 'Guardando…' : 'Registrar venta'}
          </button>
        </aside>
      </div>
    </form>
  )
}
