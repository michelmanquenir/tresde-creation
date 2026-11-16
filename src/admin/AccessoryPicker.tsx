import { Link } from 'react-router-dom'
import type { AccessoryUse } from '../data/catalog'
import type { Accessory } from '../api/accessories'
import { formatCost } from '../utils/pricing'
import Icon from '../components/Icon'

type Props = {
  value: AccessoryUse[]
  catalog: Accessory[] | null
  onChange: (value: AccessoryUse[]) => void
}

// Elige uno o más accesorios del catálogo y cuántos lleva cada pieza
export default function AccessoryPicker({ value, catalog, onChange }: Props) {
  if (!catalog) return <p className="muted small">Cargando accesorios…</p>

  const available = catalog.filter((a) => !value.some((v) => v.accessoryId === a.id))
  const setQty = (id: number, quantity: number) =>
    onChange(quantity < 1 ? value.filter((v) => v.accessoryId !== id) : value.map((v) => (v.accessoryId === id ? { ...v, quantity } : v)))

  return (
    <div className="acc-picker">
      <span className="acc-picker-label">Accesorios por pieza</span>

      {value.length > 0 && (
        <ul className="acc-picked">
          {value.map((v) => {
            const a = catalog.find((x) => x.id === v.accessoryId)
            return (
              <li key={v.accessoryId}>
                <span className="acc-picked-name">{a?.name ?? 'Accesorio eliminado'}</span>
                <div className="qty">
                  <button type="button" onClick={() => setQty(v.accessoryId, v.quantity - 1)} aria-label="Uno menos">
                    <Icon name="minus" size={14} />
                  </button>
                  <span>{v.quantity}</span>
                  <button type="button" onClick={() => setQty(v.accessoryId, v.quantity + 1)} aria-label="Uno más">
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <span className="acc-picked-cost">{formatCost((a?.cost ?? 0) * v.quantity)}</span>
                <button type="button" className="icon-btn danger" onClick={() => setQty(v.accessoryId, 0)} aria-label={`Quitar ${a?.name ?? 'accesorio'}`}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {catalog.length === 0 ? (
        <p className="muted small">
          Aún no tienes accesorios. <Link to="/admin/accesorios">Créalos aquí</Link> (argolla, clicker, imán…) y luego elígelos.
        </p>
      ) : available.length > 0 ? (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...value, { accessoryId: Number(e.target.value), quantity: 1 }])}
          aria-label="Agregar accesorio"
        >
          <option value="">{value.length ? '+ Agregar otro accesorio…' : '+ Agregar accesorio…'}</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>{a.name} · {formatCost(a.cost)}</option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
