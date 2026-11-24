import { useEffect, useState } from 'react'
import type { Product } from '../data/catalog'
import { adminApi } from '../api/products'
import {
  STATUS_LABEL,
  deliveriesApi,
  notifyDeliveriesChanged,
  type Delivery,
  type DeliveryStatus,
  type Recipient,
} from '../api/deliveries'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../context/ProductsContext'
import Icon from '../components/Icon'
import DeliveryForm from './DeliveryForm'

const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const units = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

type Tab = 'inbox' | 'sent' | 'all'
const FILTERS: { key: DeliveryStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'ACCEPTED', label: 'Aceptadas' },
  { key: 'REJECTED', label: 'Rechazadas' },
  { key: 'CANCELLED', label: 'Canceladas' },
]

// Entregas de inventario: quien imprime entrega (ej. 10 llaveros) y quien recibe acepta; recién ahí se suma el stock
export default function AdminDeliveries() {
  const { session } = useAuth()
  const me = session?.username ?? ''
  const isAdmin = session?.role === 'ADMIN'
  const { reload: reloadStore } = useProducts()

  const [list, setList] = useState<Delivery[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [tab, setTab] = useState<Tab | null>(null)
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    deliveriesApi
      .list()
      .then((l) => {
        setList(l)
        // Si hay entregas esperando mi aceptación, se abre directo en "Por recibir"
        setTab((t) => t ?? (l.some((d) => d.status === 'PENDING' && same(d.recipientUsername, me)) ? 'inbox' : 'all'))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las entregas.'))
    adminApi.list().then((p) => setProducts([...p].sort((a, b) => a.name.localeCompare(b.name, 'es')))).catch(() => {})
    deliveriesApi.recipients().then(setRecipients).catch(() => {})
  }, [me])

  const replace = (d: Delivery) => setList((prev) => (prev ?? []).map((x) => (x.id === d.id ? d : x)))

  const onCreated = (d: Delivery) => {
    setFormOpen(false)
    setList((prev) => [d, ...(prev ?? [])].sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt) || b.id - a.id))
    setTab('sent')
    setFilter('ALL')
    setNotice(`Entrega registrada: ${units(d.totalUnits)} para ${d.recipientName}. Se sumarán al stock cuando la acepte.`)
    notifyDeliveriesChanged()
  }

  const onResolved = (d: Delivery) => {
    replace(d)
    notifyDeliveriesChanged()
    if (d.status === 'ACCEPTED') {
      setNotice(`Entrega aceptada: se sumaron ${units(d.totalUnits)} al stock.`)
      reloadStore()
      adminApi.list().then((p) => setProducts([...p].sort((a, b) => a.name.localeCompare(b.name, 'es')))).catch(() => {})
    } else setNotice(d.status === 'REJECTED' ? 'Entrega rechazada. No se sumó stock.' : 'Entrega cancelada.')
  }

  const all = list ?? []
  const inboxCount = all.filter((d) => d.status === 'PENDING' && same(d.recipientUsername, me)).length
  const shown = all.filter((d) => {
    if (tab === 'inbox' && !same(d.recipientUsername, me)) return false
    if (tab === 'sent' && !same(d.senderUsername, me)) return false
    return filter === 'ALL' || d.status === filter
  })

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Entregas de inventario</h1>
          <p className="muted">Registra lo que entregas. El stock se suma recién cuando quien recibe lo acepta.</p>
        </div>
        {!formOpen && (
          <button className="btn btn-primary" onClick={() => (setFormOpen(true), setNotice(''))}>
            <Icon name="plus" size={18} /> Nueva entrega
          </button>
        )}
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      {formOpen && (
        <DeliveryForm products={products} recipients={recipients} onSaved={onCreated} onCancel={() => setFormOpen(false)} />
      )}

      <div className="admin-toolbar delivery-toolbar">
        <div className="delivery-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'inbox'} className={`chip ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
            Por recibir {inboxCount > 0 && <span className="menu-badge">{inboxCount}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'sent'} className={`chip ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
            Entregadas por mí
          </button>
          <button role="tab" aria-selected={tab === 'all'} className={`chip ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            {isAdmin ? 'Todas' : 'Todas las mías'}
          </button>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as DeliveryStatus | 'ALL')} aria-label="Filtrar por estado">
          {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>

      {!list ? (
        <p className="muted small">Cargando…</p>
      ) : shown.length === 0 ? (
        <div className="panel empty">
          <Icon name="truck" size={36} />
          <p className="muted">
            {tab === 'inbox' ? 'No tienes entregas por recibir.' : 'No hay entregas para mostrar.'}
          </p>
        </div>
      ) : (
        <ul className="delivery-list">
          {shown.map((d) => (
            <DeliveryCard key={d.id} delivery={d} me={me} isAdmin={isAdmin} onChange={replace} onResolved={onResolved} />
          ))}
        </ul>
      )}
    </>
  )
}

type CardProps = {
  delivery: Delivery
  me: string
  isAdmin: boolean
  onChange: (d: Delivery) => void
  onResolved: (d: Delivery) => void
}

type TimelineEntry = { key: string; at: string; who: string; text: string; kind: 'event' | 'comment' }

const RESOLVED_VERB: Record<DeliveryStatus, string> = {
  PENDING: '',
  ACCEPTED: 'aceptó la entrega',
  REJECTED: 'rechazó la entrega',
  CANCELLED: 'canceló la entrega',
}

function DeliveryCard({ delivery: d, me, isAdmin, onChange, onResolved }: CardProps) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pending = d.status === 'PENDING'
  const isRecipient = same(d.recipientUsername, me)
  const canCancel = pending && (same(d.senderUsername, me) || isAdmin)
  const nameOf = (username?: string) =>
    same(username, d.recipientUsername) ? d.recipientName : same(username, d.senderUsername) ? d.senderName : username ?? ''

  // Historial: la entrega, los comentarios y el cierre, en orden cronológico
  const timeline: TimelineEntry[] = [
    {
      key: 'sent',
      at: d.createdAt,
      who: d.senderName,
      text: `entregó ${units(d.totalUnits)} el ${dateFmt.format(new Date(d.deliveredAt))}${d.note ? `: “${d.note}”` : ''}`,
      kind: 'event' as const,
    },
    ...(d.resolvedAt
      ? [{ key: 'resolved', at: d.resolvedAt, who: nameOf(d.resolvedBy), text: RESOLVED_VERB[d.status], kind: 'event' as const }]
      : []),
    ...d.comments.map((c) => ({ key: `c${c.id}`, at: c.createdAt, who: c.authorName, text: c.body, kind: 'comment' as const })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const run = async (fn: () => Promise<Delivery>, resolves: boolean) => {
    setBusy(true)
    setError('')
    try {
      const updated = await fn()
      setComment('')
      ;(resolves ? onResolved : onChange)(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  const text = comment.trim() || undefined
  const onAccept = () => {
    if (!confirm(`¿Confirmas que recibiste ${units(d.totalUnits)} de ${d.senderName}? Se sumarán al stock.`)) return
    run(() => deliveriesApi.accept(d.id, text), true)
  }
  const onReject = () => {
    if (!text && !confirm('¿Rechazar sin comentario? Es útil explicar el motivo (ej. “faltan 2”).')) return
    run(() => deliveriesApi.reject(d.id, text), true)
  }
  const onCancel = () => {
    if (!confirm('¿Cancelar esta entrega? No se sumará nada al stock.')) return
    run(() => deliveriesApi.cancel(d.id, text), true)
  }
  const onComment = () => text && run(() => deliveriesApi.comment(d.id, text), false)

  const tagClass = { PENDING: 'tag-sale', ACCEPTED: 'tag-ok', REJECTED: 'tag-out', CANCELLED: 'tag-muted' }[d.status]

  return (
    <li className={`panel delivery-card ${pending && isRecipient ? 'is-mine' : ''}`}>
      <div className="delivery-head">
        <div>
          <strong>
            {d.senderName} <Icon name="arrow" size={14} /> {d.recipientName}
          </strong>
          <span className="muted small">
            Entrega #{d.id} · {dateFmt.format(new Date(d.deliveredAt))} · {units(d.totalUnits)}
          </span>
        </div>
        <span className={`tag ${tagClass}`}>{STATUS_LABEL[d.status]}</span>
      </div>

      <ul className="delivery-items">
        {d.items.map((i, idx) => (
          <li key={idx}>
            <strong>{i.quantity}×</strong> {i.productName}
            {!i.productId && <span className="muted small"> (producto eliminado)</span>}
          </li>
        ))}
      </ul>

      <ol className="delivery-timeline">
        {timeline.map((t) => (
          <li key={t.key} className={t.kind === 'comment' ? 'is-comment' : ''}>
            <p>
              <strong>{t.who}</strong> {t.kind === 'comment' ? <>comentó: “{t.text}”</> : t.text}
            </p>
            <span className="muted small">{dateTimeFmt.format(new Date(t.at))}</span>
          </li>
        ))}
      </ol>

      {error && <div className="alert">{error}</div>}

      <div className="delivery-reply">
        <textarea
          rows={2}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={pending && isRecipient ? 'Comentario (opcional): ej. “llegaron 10, todo ok”' : 'Escribe un comentario…'}
          aria-label="Comentario"
        />
        <div className="delivery-actions">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !text} onClick={onComment}>
            Comentar
          </button>
          {canCancel && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>
              Cancelar entrega
            </button>
          )}
          {pending && isRecipient && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onReject}>
                Rechazar
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onAccept}>
                <Icon name="check" size={16} /> Aceptar y sumar al stock
              </button>
            </>
          )}
        </div>
        {pending && !isRecipient && (
          <p className="muted small">Esperando que {d.recipientName} la acepte.</p>
        )}
      </div>
    </li>
  )
}
