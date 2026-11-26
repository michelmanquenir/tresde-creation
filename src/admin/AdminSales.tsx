import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice, type Product } from '../data/catalog'
import { adminApi } from '../api/products'
import { paymentLabel, salesApi, type Sale, type SaleSeller } from '../api/sales'
import { useCostSettings } from '../api/settings'
import { useProducts } from '../context/ProductsContext'
import { formatCost } from '../utils/pricing'
import {
  PENDING_ONLY,
  PERIODS,
  buckets,
  byChannel,
  groupRevenue,
  periodRange,
  saleCost,
  saleCostParts,
  saleProfit,
  saleRevenue,
  topProducts,
  totals,
  type PeriodKey,
} from '../utils/salesStats'
import Icon from '../components/Icon'
import SaleForm from './SaleForm'

const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const compact = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1).replace('.0', '')} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : formatPrice(n)

export default function AdminSales() {
  const [params, setParams] = useSearchParams()
  const presetProduct = params.get('producto') ?? undefined
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(!!presetProduct || params.has('nueva'))
  const [busyId, setBusyId] = useState<number | null>(null)
  const settings = useCostSettings()
  const { reload: reloadStore } = useProducts()
  const [sellers, setSellers] = useState<SaleSeller[]>([])
  const [sellerFilter, setSellerFilter] = useState('') // '' = todos

  useEffect(() => {
    salesApi.sellers().then(setSellers).catch(() => {})
  }, [])

  const range = useMemo(() => periodRange(period), [period])

  useEffect(() => {
    let cancelled = false
    salesApi
      .list(range.from, range.to)
      .then((list) => !cancelled && (setSales(list), setError('')))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'No se pudieron cargar las ventas.'))
    return () => {
      cancelled = true
    }
  }, [range])

  const loadProducts = () => adminApi.list().then(setProducts).catch(() => setProducts((p) => p ?? []))
  useEffect(() => {
    loadProducts()
  }, [])

  const pendingOnly = !!PENDING_ONLY[period]
  // En la semana en curso las ventas ya cuadradas no cuentan: al cerrar la semana todo vuelve a 0.
  const periodList = useMemo(() => (sales ?? []).filter((s) => !pendingOnly || !s.closingId), [sales, pendingOnly])
  const closedCount = (sales?.length ?? 0) - periodList.length
  // Filtro por vendedor ('-' = ventas antiguas sin vendedor)
  const list = useMemo(
    () =>
      !sellerFilter
        ? periodList
        : periodList.filter((s) => (sellerFilter === '-' ? !s.soldBy : s.soldBy?.toLowerCase() === sellerFilter.toLowerCase())),
    [periodList, sellerFilter],
  )
  const payments = groupRevenue(list, (s) => paymentLabel(s.paymentMethod))
  const bySeller = groupRevenue(list, (s) => s.soldByName ?? 'Sin vendedor')
  const t = totals(list)
  const chart = buckets(list, range.from, range.to)
  const maxRevenue = Math.max(1, ...chart.items.map((b) => b.revenue))
  const top = topProducts(list)
  const maxTop = Math.max(1, ...top.map((p) => p.revenue))
  const channels = byChannel(list)
  const labelEvery = Math.max(1, Math.ceil(chart.items.length / 10))

  const closeForm = () => {
    setFormOpen(false)
    if (presetProduct || params.has('nueva')) setParams({}, { replace: true })
  }

  const onSaved = (sale: Sale) => {
    closeForm()
    setNotice(`Venta registrada: ${sale.quantity} × ${sale.productName} por ${formatPrice(saleRevenue(sale))}.`)
    const soldAt = new Date(sale.soldAt)
    const inRange = (!range.from || soldAt >= range.from) && (!range.to || soldAt < range.to)
    if (inRange) setSales((prev) => [sale, ...(prev ?? [])].sort((a, b) => b.soldAt.localeCompare(a.soldAt)))
    loadProducts()
    reloadStore()
  }

  const onDelete = async (s: Sale) => {
    const msg = s.stockDiscounted
      ? `¿Anular la venta de ${s.quantity} × "${s.productName}"? Se devolverán ${s.quantity} unidades al stock.`
      : `¿Anular la venta de ${s.quantity} × "${s.productName}"?`
    if (!confirm(msg)) return
    setBusyId(s.id)
    setNotice('')
    try {
      await salesApi.remove(s.id)
      setSales((prev) => (prev ?? []).filter((x) => x.id !== s.id))
      if (s.stockDiscounted) {
        loadProducts()
        reloadStore()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la venta.')
    } finally {
      setBusyId(null)
    }
  }

  const onExport = () => {
    const head = ['Fecha', 'Producto', 'Color', 'Cantidad', 'Precio unitario', 'Total', 'Materia prima unitaria', 'Filamento', 'Accesorios', 'Materia prima total', '% máquina', 'Ganancia', 'Canal', 'Método de pago', 'Vendedor', 'Cliente', 'Nota']
    const rows = list.map((s) => {
      const profit = saleProfit(s)
      const parts = saleCostParts(s)
      const cost = saleCost(s)
      return [
        new Date(s.soldAt).toLocaleDateString('es-CL'),
        s.productName,
        s.color ?? '',
        s.quantity,
        s.unitPrice,
        saleRevenue(s),
        s.unitCost === undefined ? '' : Math.round(s.unitCost),
        parts ? Math.round(parts.filament) : '',
        parts ? Math.round(parts.accessories) : '',
        cost === null ? '' : Math.round(cost),
        s.reservePercent,
        profit === null ? '' : Math.round(profit),
        s.channel ?? '',
        s.paymentMethod ? paymentLabel(s.paymentMethod) : '',
        s.soldByName ?? '',
        s.customer ?? '',
        s.note ?? '',
      ]
    })
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `ventas-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Ventas</h1>
          <p className="muted">Registra cada venta y mira cuánto vendes y ganas.</p>
        </div>
        {!formOpen && (
          <button className="btn btn-primary" onClick={() => (setFormOpen(true), setNotice(''))}>
            <Icon name="plus" size={18} /> Registrar venta
          </button>
        )}
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      {formOpen && !products && <p className="muted small">Cargando productos…</p>}
      {formOpen && products && (
        <SaleForm
          key={presetProduct ?? 'nueva'}
          products={products}
          settings={settings}
          sellers={sellers}
          initialProductId={presetProduct}
          onSaved={onSaved}
          onCancel={closeForm}
        />
      )}

      <div className="chips sales-periods" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.key} className={`chip sm ${p.key === period ? 'active' : ''}`} aria-pressed={p.key === period} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        {sellers.length > 1 && (
          <select className="sales-seller-filter" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} aria-label="Filtrar por vendedor">
            <option value="">Todos los vendedores</option>
            {sellers.map((s) => <option key={s.username} value={s.username}>{s.name}</option>)}
            <option value="-">Sin vendedor (ventas antiguas)</option>
          </select>
        )}
      </div>

      {sales && pendingOnly && (
        <p className="muted small">
          {dateFmt.format(range.from!)} al {dateFmt.format(new Date(range.to!.getTime() - 1))} · solo ventas aún sin cuadrar.
          {closedCount > 0 && ` ${closedCount} ${closedCount === 1 ? 'venta de esta semana ya se cerró' : 'ventas de esta semana ya se cerraron'} en la cuadratura.`}
        </p>
      )}

      <div className="admin-stats sales-stats">
        <div>
          <span>Ingresos</span>
          <strong>{sales ? formatPrice(t.revenue) : '–'}</strong>
          <span className="muted small">{t.count} {t.count === 1 ? 'venta' : 'ventas'} · ticket prom. {formatPrice(Math.round(t.avgTicket))}</span>
        </div>
        <div>
          <span>Materia prima</span>
          <strong>{sales ? formatCost(Math.round(t.cost)) : '–'}</strong>
          <span className="muted small">
            {t.cost > 0
              ? [
                  t.filament || t.accessories ? `filamento ${formatCost(Math.round(t.filament))} · accesorios ${formatCost(Math.round(t.accessories))}` : '',
                  t.legacyCost ? `ventas antiguas ${formatCost(Math.round(t.legacyCost))} (incluían luz)` : '',
                ].filter(Boolean).join(' · ')
              : 'filamento y accesorios'}
          </span>
        </div>
        <div>
          <span>Ganancia</span>
          <strong className={t.profit < 0 ? 'is-loss' : ''}>{sales ? formatCost(Math.round(t.profit)) : '–'}</strong>
          <span className="muted small">
            {t.withoutCost ? `${t.withoutCost} ${t.withoutCost === 1 ? 'venta' : 'ventas'} sin costos (no suman)` : t.revenue ? `margen ${Math.round((t.profit / t.revenue) * 100)}%` : 'después de costos y máquina'}
          </span>
        </div>
        <div>
          <span>Para la máquina</span>
          <strong>{sales ? formatCost(Math.round(t.reserve)) : '–'}</strong>
          <span className="muted small">apartado de cada venta</span>
        </div>
        <div>
          <span>Unidades vendidas</span>
          <strong>{sales ? t.units : '–'}</strong>
          <span className="muted small">{top[0] ? `más vendido: ${top[0].name}` : 'sin ventas aún'}</span>
        </div>
      </div>

      {sales && list.length > 0 && (
        <div className="sales-grid">
          <section className="panel sales-chart-panel">
            <h2 className="legend">Ingresos por {chart.unit === 'day' ? 'día' : 'mes'}</h2>
            <div className="sales-chart" role="img" aria-label={`Gráfico de ingresos por ${chart.unit === 'day' ? 'día' : 'mes'}`}>
              <span className="sales-chart-max">{compact(maxRevenue)}</span>
              <div className="sales-chart-bars">
                {chart.items.map((b, i) => (
                  <div key={b.key} className="sales-chart-col" tabIndex={0} aria-label={`${b.label}: ${formatPrice(b.revenue)}`}>
                    <span className="sales-chart-tip">
                      <strong>{formatPrice(b.revenue)}</strong>
                      {b.label} · {b.units} u.
                    </span>
                    <span className="sales-chart-bar" style={{ height: `${(b.revenue / maxRevenue) * 100}%` }} />
                    <span className="sales-chart-label">{i % labelEvery === 0 ? b.label : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="legend">Más vendidos</h2>
            <ul className="dash-bars sales-top">
              {top.map((p) => (
                <li key={p.key} title={`${p.units} u. · ${formatPrice(p.revenue)}${p.profit !== null ? ` · ganancia ${formatCost(Math.round(p.profit))}` : ''}`}>
                  <span className="dash-bar-label">{p.name}</span>
                  <span className="dash-bar-track">
                    <span className="dash-bar-fill" style={{ width: `${(p.revenue / maxTop) * 100}%` }} />
                  </span>
                  <strong>{compact(p.revenue)}</strong>
                </li>
              ))}
            </ul>
            <h2 className="legend sales-sub">Por método de pago</h2>
            <ul className="dash-list">
              {payments.map((p) => (
                <li key={p.key}>
                  <span>{p.key} <span className="muted small">({p.count})</span></span>
                  <strong>{formatPrice(p.revenue)}</strong>
                </li>
              ))}
            </ul>
            {!sellerFilter && bySeller.length > 1 && (
              <>
                <h2 className="legend sales-sub">Por vendedor</h2>
                <ul className="dash-list">
                  {bySeller.map((p) => (
                    <li key={p.key}>
                      <span>{p.key} <span className="muted small">({p.count})</span></span>
                      <strong>{formatPrice(p.revenue)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {channels.length > 0 && (
              <>
                <h2 className="legend sales-sub">Por canal</h2>
                <ul className="dash-list">
                  {channels.map((c) => (
                    <li key={c.channel}>
                      <span>{c.channel} <span className="muted small">({c.count})</span></span>
                      <strong>{formatPrice(c.revenue)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      <section className="panel sales-history">
        <div className="sale-form-head">
          <h2 className="legend">Historial</h2>
          {list.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onExport} title="Descargar las ventas del período en Excel (CSV)">
              <Icon name="download" size={16} /> Exportar
            </button>
          )}
        </div>
        {!sales ? (
          <p className="muted small">Cargando ventas…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <Icon name="receipt" size={36} />
            <p className="muted">{pendingOnly ? (closedCount > 0 ? 'Semana cerrada: aún no hay ventas nuevas.' : 'Aún no hay ventas esta semana.') : 'No hay ventas en este período.'}</p>
          </div>
        ) : (
          <div className="sales-table" role="table" aria-label="Historial de ventas">
            <div className="sales-row sales-row-head" role="row">
              <span role="columnheader">Fecha</span>
              <span role="columnheader">Producto</span>
              <span role="columnheader" className="right">Total</span>
              <span role="columnheader" className="right">Materia prima</span>
              <span role="columnheader" className="right">Ganancia</span>
              <span role="columnheader">Canal · pago</span>
              <span role="columnheader" />
            </div>
            {list.map((s) => {
              const profit = saleProfit(s)
              const cost = saleCost(s)
              const parts = saleCostParts(s)
              return (
                <div key={s.id} className="sales-row" role="row">
                  <span role="cell" className="muted small">{dateFmt.format(new Date(s.soldAt))}</span>
                  <span role="cell" className="sales-product">
                    {s.color && <span className="swatch sm" style={{ background: s.color }} />}
                    <span>
                      <strong>{s.quantity} × </strong>
                      {s.productId ? <Link to={`/admin/productos/${s.productId}/editar`}>{s.productName}</Link> : s.productName}
                      {(s.customer || s.note || s.soldByName) && (
                        <span className="muted small sales-meta">
                          {[s.soldByName && `Vendió ${s.soldByName}`, s.customer, s.note].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </span>
                  <span role="cell" className="right">
                    <strong>{formatPrice(saleRevenue(s))}</strong>
                    {s.quantity > 1 && <span className="muted small sales-meta">{formatPrice(s.unitPrice)} c/u</span>}
                  </span>
                  <span role="cell" className="right">
                    {cost === null ? (
                      <span className="muted small">—</span>
                    ) : (
                      <>
                        −{formatCost(Math.round(cost))}
                        {parts && (
                          <span className="muted small sales-meta">
                            filamento {formatCost(Math.round(parts.filament))}{parts.accessories > 0 && ` · acc. ${formatCost(Math.round(parts.accessories))}`}
                          </span>
                        )}
                        {!parts && (
                          <span className="muted small sales-meta" title="Venta registrada antes del cambio: su costo incluía la luz">
                            incluye luz
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <span role="cell" className={`right ${profit !== null && profit < 0 ? 'is-loss' : ''}`}>
                    {profit === null ? <span className="muted small">Sin costos</span> : formatCost(Math.round(profit))}
                  </span>
                  <span role="cell" className="small">
                    {s.channel ?? '—'}
                    {s.paymentMethod && <span className="muted small sales-meta">{paymentLabel(s.paymentMethod)}</span>}
                  </span>
                  <span role="cell" className="right">
                    {s.closingId ? (
                      <span className="tag tag-muted" title="Ya está en una cuadratura: para anularla, anula primero esa cuadratura">
                        Cerrada
                      </span>
                    ) : (
                      <button className="icon-btn danger" disabled={busyId === s.id} onClick={() => onDelete(s)} title="Anular venta" aria-label="Anular venta">
                        <Icon name="trash" size={17} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
