import { useEffect, useState, type FormEvent } from 'react'
import { MATERIALS, formatPrice, type Material } from '../data/catalog'
import { saveCostSettings, settingsApi } from '../api/settings'
import { ApiError } from '../api/client'
import { computeCost, formatCost, saleSummary, type CostSettings } from '../utils/pricing'
import CostLines from './CostLines'

type FormState = {
  machineHourCost: string
  machineReservePercent: string
  priceMultiplier: string
  filament: Record<Material, string>
}

const toForm = (s: CostSettings): FormState => ({
  machineHourCost: String(s.machineHourCost),
  machineReservePercent: String(s.machineReservePercent),
  priceMultiplier: String(s.priceMultiplier),
  filament: Object.fromEntries(MATERIALS.map((m) => [m, String(s.filamentPricePerKg[m] ?? 0)])) as Record<Material, string>,
})

const toSettings = (f: FormState): CostSettings => ({
  machineHourCost: Number(f.machineHourCost) || 0,
  machineReservePercent: Number(f.machineReservePercent) || 0,
  priceMultiplier: Number(f.priceMultiplier) || 0,
  filamentPricePerKg: Object.fromEntries(MATERIALS.map((m) => [m, Number(f.filament[m]) || 0])) as Record<Material, number>,
})

// Producto de ejemplo para ver cómo afecta la configuración
const EXAMPLE = { grams: 8, batchHours: 11, batchPieces: 10, accessoriesCost: 30 }

export default function AdminSettings() {
  const [form, setForm] = useState<FormState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Calculadora de electricidad (no se guarda)
  const [watts, setWatts] = useState('')
  const [kwhPrice, setKwhPrice] = useState('')

  useEffect(() => {
    settingsApi
      .getCosts()
      .then((s) => setForm(toForm(s)))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.'))
  }, [])

  if (loadError) return <div className="alert">{loadError}</div>
  if (!form) return <div className="empty"><p className="muted">Cargando configuración…</p></div>

  const set = (key: Exclude<keyof FormState, 'filament'>, value: string) => {
    setForm({ ...form, [key]: value })
    setNotice('')
  }
  const setFilament = (m: Material, value: string) => {
    setForm({ ...form, filament: { ...form.filament, [m]: value } })
    setNotice('')
  }

  const settings = toSettings(form)
  const electricity = watts && kwhPrice ? (Number(watts) / 1000) * Number(kwhPrice) : null
  const example = computeCost(EXAMPLE, 'PLA', settings)
  const exampleSale = example ? saleSummary(example.suggested, example.total, settings) : null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setErrors({})
    setSaving(true)
    try {
      setForm(toForm(await saveCostSettings(settings)))
      setNotice('Configuración guardada. Los costos de los productos ya usan estos valores.')
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setError(err.message)
      } else {
        setError('No se pudo guardar.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Configuración de costos</h1>
          <p className="muted">Estos valores se usan para calcular el costo y el precio sugerido de cada producto.</p>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={onSubmit} noValidate>
        <div className="admin-form-main">
          <fieldset className="panel">
            <legend>Impresora</legend>
            <label className="field">
              <span>Valor hora de la máquina <span className="muted small">(pesos por hora de impresión)</span></span>
              <input type="number" min={0} step={1} inputMode="decimal" value={form.machineHourCost} onChange={(e) => set('machineHourCost', e.target.value)} />
              {errors.machineHourCost && <span className="field-error">{errors.machineHourCost}</span>}
            </label>

            <div className="calc-box">
              <p className="small"><strong>¿No sabes el valor hora?</strong> Calcúlalo con el consumo de tu impresora:</p>
              <div className="field-row">
                <label className="field">
                  Consumo (watts)
                  <input type="number" min={0} value={watts} onChange={(e) => setWatts(e.target.value)} placeholder="Ej: 150" />
                </label>
                <label className="field">
                  Precio del kWh
                  <input type="number" min={0} value={kwhPrice} onChange={(e) => setKwhPrice(e.target.value)} placeholder="Ej: 230" />
                </label>
              </div>
              {electricity !== null && (
                <div className="calc-result">
                  <span>Electricidad: <strong>{formatCost(electricity)}</strong> por hora</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('machineHourCost', String(Math.round(electricity * 10) / 10))}>
                    Usar este valor
                  </button>
                </div>
              )}
              <p className="muted small">El consumo suele venir en la ficha de la impresora o en su cargador (entre 100 y 350 W). El precio del kWh aparece en tu boleta de luz.</p>
            </div>

            <label className="field">
              <span>% de cada venta para recuperar la máquina</span>
              <input type="number" min={0} max={90} step={1} value={form.machineReservePercent} onChange={(e) => set('machineReservePercent', e.target.value)} />
              <span className="muted small">Se descuenta del precio de venta para ahorrar para mantención, repuestos o una impresora nueva.</span>
              {errors.machineReservePercent && <span className="field-error">{errors.machineReservePercent}</span>}
            </label>
          </fieldset>

          <fieldset className="panel">
            <legend>Filamento <span className="muted small">(precio por kg)</span></legend>
            <div className="field-row">
              {MATERIALS.map((m) => (
                <label key={m} className="field">
                  {m}
                  <input type="number" min={0} step={100} inputMode="numeric" value={form.filament[m]} onChange={(e) => setFilament(m, e.target.value)} />
                  <span className="muted small">{formatCost((Number(form.filament[m]) || 0) / 1000)} por gramo</span>
                  {errors[`filamentPricePerKg[${m}]`] && <span className="field-error">{errors[`filamentPricePerKg[${m}]`]}</span>}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend>Precio de venta</legend>
            <label className="field">
              <span>Multiplicador <span className="muted small">(precio sugerido = costo × multiplicador)</span></span>
              <input type="number" min={1} step={0.5} value={form.priceMultiplier} onChange={(e) => set('priceMultiplier', e.target.value)} />
              {errors.priceMultiplier && <span className="field-error">{errors.priceMultiplier}</span>}
            </label>
          </fieldset>
        </div>

        <aside className="admin-form-side">
          {example && exampleSale && (
            <div className="panel">
              <span className="legend">Ejemplo</span>
              <p className="muted small">
                Llavero de PLA de {EXAMPLE.grams} g, impreso en un lote de {EXAMPLE.batchPieces} piezas que tarda {EXAMPLE.batchHours} h, con un accesorio de {formatPrice(EXAMPLE.accessoriesCost)}.
              </p>
              <CostLines cost={example} />
              <dl className="cost-lines">
                <div className="cost-total"><dt>Precio sugerido</dt><dd>{formatPrice(example.suggested)}</dd></div>
                <div><dt>Para la máquina ({settings.machineReservePercent}%)</dt><dd>−{formatCost(exampleSale.reserve)}</dd></div>
                <div className="cost-total"><dt>Ganancia</dt><dd>{formatCost(exampleSale.profit)}</dd></div>
              </dl>
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </aside>
      </form>
    </>
  )
}
