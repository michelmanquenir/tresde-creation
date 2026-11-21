import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { closingsApi, cutoffOf, lastSunday, toDateInput, type Closing, type ClosingsOverview } from '../api/closings'
import { formatPrice } from '../data/catalog'
import Icon from '../components/Icon'

const money = (n: number) => formatPrice(Math.round(n))
const dayFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
/** El corte es las 00:00 del día siguiente: para mostrarlo se usa el día anterior. */
const cutDay = (iso: string) => new Date(new Date(iso).getTime() - 1)

type Amounts = { materials: string; machine: string; profit: string }
const amountsOf = (p: Closing): Amounts => ({
  materials: String(Math.round(p.materials)),
  machine: String(Math.round(p.machine)),
  profit: String(Math.max(0, Math.round(p.profit))),
})

// Cuadratura semanal: cada domingo se cierran las ventas, se retira la ganancia y lo de la máquina,
// y se reinvierte la materia prima. Lo retirado para la máquina va pagando la impresora.
export default function AdminClosings() {
  const [overview, setOverview] = useState<ClosingsOverview | null>(null)
  const [day, setDay] = useState(lastSunday)
  // Vista previa de la semana elegida (se descarta si cambia la fecha mientras carga)
  const [loaded, setLoaded] = useState<{ key: string; data: Closing } | null>(null)
  const [maxDay] = useState(() => toDateInput(new Date(Date.now() + 7 * 86400000)))
  const [amounts, setAmounts] = useState<Amounts>({ materials: '', machine: '', profit: '' })
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [version, setVersion] = useState(0) // recarga después de cerrar o anular

  useEffect(() => {
    closingsApi.overview().then(setOverview).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar.'))
  }, [version])

  useEffect(() => {
    let active = true
    const key = `${day}#${version}`
    closingsApi
      .preview(cutoffOf(day))
      .then((p) => {
        if (!active) return
        setLoaded({ key, data: p })
        setAmounts(amountsOf(p))
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudo calcular la semana.'))
    return () => {
      active = false
    }
  }, [day, version])
  const preview = loaded?.key === `${day}#${version}` ? loaded.data : null

  const value = (s: string) => Math.max(0, Number(s) || 0)
  const moved = value(amounts.materials) + value(amounts.machine) + value(amounts.profit)
  const leftover = preview ? preview.revenue - moved : 0
  const later = overview && preview ? overview.pendingSales - preview.salesCount : 0

  const onClose = async (e: FormEvent) => {
    e.preventDefault()
    if (!preview?.salesCount) return
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await closingsApi.create({
        to: cutoffOf(day).toISOString(),
        materialsReinvested: value(amounts.materials),
        machineWithdrawn: value(amounts.machine),
        profitWithdrawn: value(amounts.profit),
        note: note.trim() || undefined,
      })
      setNotice(`Semana cerrada: retiraste ${money(value(amounts.profit))} de ganancia y ${money(value(amounts.machine))} para la máquina.`)
      setNote('')
      setVersion((v) => v + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la semana.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (c: Closing) => {
    if (!c.id) return
    if (!confirm(`¿Anular la cuadratura del ${fullFmt.format(cutDay(c.periodTo))}? Sus ${c.salesCount} ventas vuelven a quedar pendientes y su retiro de máquina deja de descontarse.`)) return
    setError('')
    setNotice('')
    setBusyId(c.id)
    try {
      await closingsApi.remove(c.id)
      setNotice('Cuadratura anulada.')
      setVersion((v) => v + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular.')
    } finally {
      setBusyId(null)
    }
  }

  // Pago de la impresora
  const price = overview?.machinePrice ?? 0
  const recovered = overview?.machineRecovered ?? 0
  const pct = price > 0 ? Math.min(100, (recovered / price) * 100) : 0
  const closings = overview?.closings ?? []
  const avgMachine = closings.length ? recovered / closings.length : 0
  const weeksLeft = avgMachine > 0 && overview ? Math.ceil(overview.machineRemaining / avgMachine) : null

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Cuadratura</h1>
          <p className="muted">Cada domingo cierra la semana: retira la ganancia y lo de la máquina, y reinvierte la materia prima.</p>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <section className="panel machine-fund">
        <div className="machine-fund-head">
          <h2 className="legend">Pago de la impresora</h2>
          <Link to="/admin/configuracion" className="muted small">Valor: {money(price)}</Link>
        </div>
        {price > 0 ? (
          <>
            <div className="fund-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="fund-numbers">
              <span>Recuperado <strong>{money(recovered)}</strong> <span className="muted small">({Math.floor(pct)}%)</span></span>
              <span>
                {overview && overview.machineRemaining <= 0 ? (
                  <strong className="fund-done">¡Impresora pagada!</strong>
                ) : (
                  <>Faltan <strong>{money(overview?.machineRemaining ?? 0)}</strong>{weeksLeft && <span className="muted small"> · ~{weeksLeft} {weeksLeft === 1 ? 'semana' : 'semanas'} a este ritmo</span>}</>
                )}
              </span>
            </div>
          </>
        ) : (
          <p className="muted small">Define el valor de la impresora en <Link to="/admin/configuracion">Configuración</Link> para ver cuánto falta por pagar.</p>
        )}
      </section>

      <form className="panel closing-form" onSubmit={onClose} noValidate>
        <div className="closing-form-head">
          <h2 className="legend">Cerrar semana</h2>
          <label className="field closing-day">
            <span>Ventas hasta el</span>
            <input type="date" value={day} max={maxDay} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </label>
        </div>

        {!preview ? (
          <p className="muted small">Calculando…</p>
        ) : preview.salesCount === 0 ? (
          <div className="empty">
            <Icon name="check" size={32} />
            <p className="muted">No hay ventas pendientes hasta el {dayFmt.format(cutDay(preview.periodTo))}.{later > 0 && ` Hay ${later} ${later === 1 ? 'venta posterior' : 'ventas posteriores'} para la próxima cuadratura.`}</p>
          </div>
        ) : (
          <>
            <p className="muted small">
              {preview.salesCount} {preview.salesCount === 1 ? 'venta' : 'ventas'} · {preview.units} u.
              {preview.periodFrom && ` · desde el ${dayFmt.format(new Date(preview.periodFrom))}`} · ingresos <strong>{money(preview.revenue)}</strong>
            </p>
            {preview.salesWithoutCost > 0 && (
              <div className="alert">
                {preview.salesWithoutCost} {preview.salesWithoutCost === 1 ? 'venta es de un producto' : 'ventas son de productos'} sin costos cargados: su materia prima cuenta como $0 y todo queda como ganancia.
              </div>
            )}

            <div className="closing-split">
              <label className="closing-box is-materials">
                <span className="closing-box-title"><Icon name="layers" size={18} /> Reinvertir en materia prima</span>
                <span className="muted small">Calculado: {money(preview.materials)} (filamento + accesorios)</span>
                <input type="number" min={0} step={1} inputMode="numeric" value={amounts.materials} onChange={(e) => setAmounts({ ...amounts, materials: e.target.value })} />
              </label>
              <label className="closing-box is-machine">
                <span className="closing-box-title"><Icon name="gear" size={18} /> Retirar para la máquina</span>
                <span className="muted small">Calculado: {money(preview.machine)} · se descuenta de la impresora</span>
                <input type="number" min={0} step={1} inputMode="numeric" value={amounts.machine} onChange={(e) => setAmounts({ ...amounts, machine: e.target.value })} />
              </label>
              <label className="closing-box is-profit">
                <span className="closing-box-title"><Icon name="star" size={18} /> Retirar ganancia</span>
                <span className="muted small">Calculado: {money(preview.profit)}</span>
                <input type="number" min={0} step={1} inputMode="numeric" value={amounts.profit} onChange={(e) => setAmounts({ ...amounts, profit: e.target.value })} />
              </label>
            </div>

            {Math.abs(leftover) >= 1 && (
              <p className={`closing-diff ${leftover < 0 ? 'is-loss' : ''}`}>
                {leftover > 0
                  ? `Quedan ${money(leftover)} sin asignar (quedan en caja).`
                  : `Estás moviendo ${money(-leftover)} más de lo que entró esta semana.`}{' '}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAmounts(amountsOf(preview))}>Usar lo calculado</button>
              </p>
            )}

            <label className="field">
              Nota <span className="muted small">(opcional)</span>
              <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ej: compré 2 kg de PLA negro" />
            </label>
            {later > 0 && (
              <p className="muted small">Hay {later} {later === 1 ? 'venta posterior' : 'ventas posteriores'} a esta fecha: {later === 1 ? 'queda' : 'quedan'} para la próxima cuadratura.</p>
            )}
            <div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Icon name="check" size={18} /> {saving ? 'Cerrando…' : 'Cerrar semana y registrar retiro'}
              </button>
            </div>
          </>
        )}
      </form>

      <section className="panel">
        <h2 className="legend">Cuadraturas anteriores</h2>
        {!overview ? (
          <p className="muted small">Cargando…</p>
        ) : closings.length === 0 ? (
          <p className="muted small">Aún no cierras ninguna semana.</p>
        ) : (
          <ul className="closing-list">
            {closings.map((c) => (
              <li key={c.id} className="closing-item">
                <div className="closing-item-head">
                  <div>
                    <strong>Semana al {fullFmt.format(cutDay(c.periodTo))}</strong>
                    <span className="muted small">
                      {c.salesCount} {c.salesCount === 1 ? 'venta' : 'ventas'} · ingresos {money(c.revenue)}
                      {c.createdBy && ` · cerró ${c.createdBy}`}
                    </span>
                  </div>
                  <button type="button" className="icon-btn danger" disabled={busyId === c.id} onClick={() => onDelete(c)} title="Anular cuadratura" aria-label="Anular cuadratura">
                    <Icon name="trash" size={17} />
                  </button>
                </div>
                <dl className="closing-amounts">
                  <div><dt>Materia prima</dt><dd>{money(c.materialsReinvested ?? 0)}</dd></div>
                  <div><dt>Máquina</dt><dd>{money(c.machineWithdrawn ?? 0)}</dd></div>
                  <div><dt>Ganancia</dt><dd>{money(c.profitWithdrawn ?? 0)}</dd></div>
                </dl>
                {c.note && <p className="muted small closing-note">{c.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
