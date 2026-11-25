import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatPrice } from '../data/catalog'
import { salesApi, type Sale } from '../api/sales'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductsContext'
import Icon from '../components/Icon'
import SaleForm from './SaleForm'

const dateTimeFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

type Period = 'today' | 'week' | 'month'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

/** Desde el inicio del día / semana (lunes) / mes, hasta ahora. */
function startOf(period: Period) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  if (period === 'month') d.setDate(1)
  return d
}

const revenue = (s: Sale) => s.quantity * s.unitPrice

// Ventas del vendedor: registra ventas a precio de catálogo y ve solo las suyas (sin costos ni ganancias)
export default function SellerSales() {
  const { session } = useAuth()
  const { visibleProducts, status, reload: reloadStore } = useProducts()
  // ?producto=id: viene del botón "Vender" de Productos
  const [params, setParams] = useSearchParams()
  const presetProduct = params.get('producto') ?? undefined
  const [period, setPeriod] = useState<Period>('today')
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [formOpen, setFormOpen] = useState(true)
  const [formKey, setFormKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const from = useMemo(() => startOf(period), [period])

  useEffect(() => {
    let cancelled = false
    setSales(null)
    salesApi
      .list(from)
      .then((list) => !cancelled && (setSales(list), setError('')))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'No se pudieron cargar tus ventas.'))
    return () => {
      cancelled = true
    }
  }, [from])

  const products = useMemo(
    () => [...visibleProducts].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [visibleProducts],
  )

  const onSaved = (sale: Sale) => {
    setNotice(`Venta registrada: ${sale.quantity} × ${sale.productName} por ${formatPrice(revenue(sale))}.`)
    setSales((prev) => [sale, ...(prev ?? [])])
    setFormKey((k) => k + 1) // formulario limpio para la siguiente venta
    if (presetProduct) setParams({}, { replace: true })
    reloadStore() // actualiza el stock que se muestra
  }

  // Si se pide otro producto desde "Vender", el formulario se abre con ese producto
  useEffect(() => {
    if (presetProduct) setFormOpen(true)
  }, [presetProduct])

  const list = sales ?? []
  const total = list.reduce((sum, s) => sum + revenue(s), 0)
  const units = list.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Mis ventas</h1>
          <p className="muted">Hola, {session?.name}. Registra cada venta para que se descuente del stock.</p>
        </div>
        {!formOpen && (
          <button className="btn btn-primary" onClick={() => (setFormOpen(true), setNotice(''))}>
            <Icon name="plus" size={18} /> Registrar venta
          </button>
        )}
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      {formOpen &&
        (status === 'loading' ? (
          <p className="muted small">Cargando productos…</p>
        ) : (
          <SaleForm
            key={`${formKey}-${presetProduct ?? ''}`}
            seller
            products={products}
            settings={null}
            initialProductId={presetProduct}
            onSaved={onSaved}
            onCancel={() => {
              setFormOpen(false)
              if (presetProduct) setParams({}, { replace: true })
            }}
          />
        ))}

      <div className="chips sales-periods" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.key} className={`chip sm ${p.key === period ? 'active' : ''}`} aria-pressed={p.key === period} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="admin-stats seller-stats">
        <div>
          <span>Vendido</span>
          <strong>{sales ? formatPrice(total) : '–'}</strong>
          <span className="muted small">{list.length} {list.length === 1 ? 'venta' : 'ventas'}</span>
        </div>
        <div>
          <span>Unidades</span>
          <strong>{sales ? units : '–'}</strong>
          <span className="muted small">{PERIODS.find((p) => p.key === period)?.label.toLowerCase()}</span>
        </div>
      </div>

      <section className="panel sales-history">
        <h2 className="legend">Historial</h2>
        {!sales ? (
          <p className="muted small">Cargando ventas…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <Icon name="receipt" size={36} />
            <p className="muted">Aún no registras ventas en este período.</p>
          </div>
        ) : (
          <ul className="dash-list seller-sales">
            {list.map((s) => (
              <li key={s.id}>
                <span>
                  {s.color && <span className="swatch sm" style={{ background: s.color }} />} <strong>{s.quantity} ×</strong> {s.productName}
                  <span className="muted small sales-meta">
                    {[dateTimeFmt.format(new Date(s.soldAt)), s.channel, s.customer, s.note].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <strong>{formatPrice(revenue(s))}</strong>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Si te equivocaste en una venta, avísale al administrador para que la anule.</p>
      </section>
    </>
  )
}
