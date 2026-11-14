import { useState, type KeyboardEvent } from 'react'
import Icon from '../components/Icon'

import { LOW_STOCK } from '../data/catalog'

type Props = {
  stock: number
  disabled?: boolean
  onSave: (stock: number) => void
}

// Stock editable desde la lista: con − / + o escribiendo el número (se guarda al salir del campo o con Enter)
export default function StockEditor({ stock, disabled, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? String(stock)

  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isInteger(n) && n >= 0 && n !== stock) onSave(n)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      setDraft(null)
      e.currentTarget.blur()
    }
  }

  const tone = stock === 0 ? 'is-out' : stock <= LOW_STOCK ? 'is-low' : ''
  return (
    <div className="stock-editor" title={stock === 0 ? 'Agotado' : stock <= LOW_STOCK ? 'Quedan pocas unidades' : undefined}>
      <div className={`qty stock-qty ${tone}`}>
        <button type="button" disabled={disabled || stock === 0} onClick={() => onSave(stock - 1)} aria-label="Restar una unidad">
          <Icon name="minus" size={14} />
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label="Stock disponible"
        />
        <button type="button" disabled={disabled} onClick={() => onSave(stock + 1)} aria-label="Sumar una unidad">
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  )
}
