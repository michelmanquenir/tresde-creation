import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatPrice, MATERIALS, productCategories, type AccessoryUse, type Material, type Product } from '../data/catalog'
import { useProducts } from '../context/ProductsContext'
import { adminApi, type ProductInput } from '../api/products'
import { ApiError } from '../api/client'
import { resizeImage } from '../utils/image'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import { useCostSettings } from '../api/settings'
import { computeCost, formatCost, saleSummary } from '../utils/pricing'
import CostLines from './CostLines'
import AccessoryPicker from './AccessoryPicker'
import { accessoriesCost, useAccessories } from '../api/accessories'
import { useCategories } from '../context/CategoriesContext'

const MAX_IMAGES = 6
const PRESET_COLORS = ['#f4f1ea', '#2b2b2b', '#bdbdbd', '#e8443a', '#e86a3a', '#f2c14e', '#1e9e6a', '#3a7be8', '#7b4bd6', '#d4af37']

type FormState = {
  name: string
  categories: string[] // la primera es la principal
  price: string
  onSale: boolean // muestra el precio anterior tachado
  oldPrice: string
  description: string
  material: Material
  heightCm: string
  printHours: string
  stock: string
  colors: string[]
  images: string[]
  isNew: boolean
  bestSeller: boolean
  hidden: boolean
  // Costos (solo panel)
  grams: string
  batchHours: string
  batchPieces: string
  accessories: AccessoryUse[]
}

const emptyForm: FormState = {
  name: '',
  categories: [],
  price: '',
  onSale: false,
  oldPrice: '',
  description: '',
  material: 'PLA',
  heightCm: '',
  printHours: '',
  stock: '',
  colors: ['#bdbdbd'],
  images: [],
  isNew: true,
  bestSeller: false,
  hidden: false,
  grams: '',
  batchHours: '',
  batchPieces: '1',
  accessories: [],
}

const str = (n?: number) => (n === undefined || n === null ? '' : String(n))

const toForm = (p: Product): FormState => ({
  name: p.name,
  categories: productCategories(p),
  price: String(p.price),
  onSale: !!p.oldPrice,
  oldPrice: p.oldPrice ? String(p.oldPrice) : '',
  description: p.description,
  material: p.material,
  heightCm: p.heightCm ? String(p.heightCm) : '',
  printHours: p.printHours ? String(p.printHours) : '',
  stock: String(p.stock ?? 0),
  colors: p.colors.length ? p.colors : ['#bdbdbd'],
  images: p.images ?? [],
  isNew: !!p.isNew,
  bestSeller: !!p.bestSeller,
  hidden: !!p.hidden,
  grams: str(p.cost?.grams),
  batchHours: str(p.cost?.batchHours),
  batchPieces: str(p.cost?.batchPieces) || '1',
  accessories: p.cost?.accessories ?? [],
})

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

// Carga el producto (si es edición) y luego muestra el formulario
export default function AdminProductForm() {
  const { id } = useParams()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; product?: Product; error?: string }>(
    { status: id ? 'loading' : 'ready' },
  )

  useEffect(() => {
    if (!id) return
    adminApi
      .get(id)
      .then((product) => setState({ status: 'ready', product }))
      .catch((e) =>
        setState({
          status: 'error',
          error: e instanceof ApiError && e.status === 404 ? 'Producto no encontrado.' : e.message,
        }),
      )
  }, [id])

  if (state.status === 'loading') {
    return <div className="empty"><p className="muted">Cargando producto…</p></div>
  }
  if (state.status === 'error') {
    return (
      <div className="empty">
        <h1>{state.error}</h1>
        <Link to="/admin/productos" className="btn btn-primary">Volver al listado</Link>
      </div>
    )
  }
  return <ProductForm existing={state.product} />
}

function ProductForm({ existing }: { existing?: Product }) {
  const { reload: reloadStore } = useProducts()
  const navigate = useNavigate()
  const isEdit = !!existing

  const [form, setForm] = useState<FormState>(() => (existing ? toForm(existing) : emptyForm))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const costSettings = useCostSettings()
  const accessoryCatalog = useAccessories()
  const { categories } = useCategories()

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  // ── Imágenes: se reducen en el navegador y se suben al servidor ──
  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const room = MAX_IMAGES - form.images.length
    if (!list.length || room <= 0) return
    setUploading(true)
    setSaveError('')
    try {
      const urls = await Promise.all(
        list.slice(0, room).map(async (file) => {
          const blob = await resizeImage(file)
          return (await adminApi.uploadImage(blob, file.name.replace(/\.\w+$/, '') + '.jpg')).url
        }),
      )
      setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, MAX_IMAGES) }))
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'No se pudo subir una de las imágenes.')
    } finally {
      setUploading(false)
    }
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }
  const addImageUrl = () => {
    const url = imageUrl.trim()
    if (!url || form.images.length >= MAX_IMAGES) return
    set('images', [...form.images, url])
    setImageUrl('')
  }
  const moveImage = (from: number, to: number) => {
    const imgs = [...form.images]
    const [moved] = imgs.splice(from, 1)
    imgs.splice(to, 0, moved)
    set('images', imgs)
  }

  // ── Colores ──
  const setColor = (i: number, value: string) => set('colors', form.colors.map((c, j) => (j === i ? value : c)))
  const addColor = (value = '#ff5a1f') => {
    if (!form.colors.includes(value)) set('colors', [...form.colors, value])
  }
  const removeColor = (i: number) => set('colors', form.colors.filter((_, j) => j !== i))

  // ── Construir producto ──
  const toInput = (): ProductInput => ({
    name: form.name.trim(),
    categories: form.categories,
    price: Number(form.price) || 0,
    oldPrice: form.onSale ? num(form.oldPrice) : undefined,
    description: form.description.trim(),
    material: form.material,
    heightCm: num(form.heightCm),
    printHours: num(form.printHours),
    colors: form.colors,
    images: form.images,
    isNew: form.isNew,
    bestSeller: form.bestSeller,
    hidden: form.hidden,
    cost: {
      grams: num(form.grams),
      batchHours: num(form.batchHours),
      batchPieces: num(form.batchPieces) ?? 1,
      accessories: form.accessories,
    },
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Escribe un nombre.'
    if (!form.categories.length) e.categories = 'Elige al menos una categoría.'
    if (!(Number(form.price) > 0)) e.price = 'El precio debe ser mayor a 0.'
    if (form.onSale && !(Number(form.oldPrice) > Number(form.price)))
      e.oldPrice = 'El precio anterior debe ser mayor al precio de oferta.'
    if (!form.description.trim()) e.description = 'Agrega una descripción.'
    if (!form.colors.length) e.colors = 'Agrega al menos un color.'
    if (form.batchPieces && !(Number(form.batchPieces) >= 1)) e['cost.batchPieces'] = 'Al menos 1 pieza por lote.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (!validate()) return
    setSaving(true)
    try {
      const input = toInput()
      const saved = existing ? await adminApi.update(existing.id, input) : await adminApi.create(input)
      reloadStore()
      // Si es nuevo, la lista ofrece entregar sus unidades (así entran al stock)
      navigate('/admin/productos', { state: { saved: saved.name, createdId: existing ? undefined : saved.id } })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors) // errores por campo que devuelve el backend
        setSaveError(err.message)
      } else {
        setSaveError('No se pudo guardar.')
      }
      setSaving(false)
    }
  }

  // Costo y ganancia en vivo con la configuración del panel
  const cost = costSettings ? computeCost(
        { ...toInput().cost, accessoriesCost: accessoriesCost(form.accessories, accessoryCatalog ?? []) },
        form.material,
        costSettings,
      ) : null
  const price = Number(form.price) || 0
  const sale = cost && costSettings && price > 0 ? saleSummary(price, cost.total, costSettings) : null

  const preview: Product = {
    ...toInput(),
    id: existing?.id ?? 'vista-previa',
    category: form.categories[0] ?? '',
    name: form.name || 'Nombre del producto',
    rating: existing?.rating,
    stock: existing?.stock ?? 0,
  }

  return (
    <>
      <Link to="/admin/productos" className="back-link"><Icon name="back" size={16} /> Volver a productos</Link>
      <div className="admin-title">
        <h1>{isEdit ? `Editar: ${existing?.name}` : 'Nuevo producto'}</h1>
      </div>

      <form className="admin-form" onSubmit={onSubmit} noValidate>
        <div className="admin-form-main">
          {/* Producto */}
          <fieldset className="panel">
            <legend>Producto</legend>
            <label className="field">
              Nombre *
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Llavero Naruto" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label className="field">
              Descripción *
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tamaño, detalles, si viene pintada o lista para pintar…"
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </label>
            <div className="field">
              <span>
                Categorías * <span className="muted small">(puedes marcar varias)</span>
              </span>
              <div className="cat-picker" role="group" aria-label="Categorías">
                {categories.map((c) => {
                  const on = form.categories.includes(c.slug)
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      className={`chip sm ${on ? 'active' : ''}`}
                      aria-pressed={on}
                      onClick={() =>
                        set('categories', on ? form.categories.filter((s) => s !== c.slug) : [...form.categories, c.slug])
                      }
                    >
                      <Icon name={on ? 'check' : c.icon} size={14} /> {c.name}
                    </button>
                  )
                })}
                <Link to="/admin/categorias" className="chip sm chip-link">
                  <Icon name="plus" size={14} /> Nueva categoría
                </Link>
              </div>
              {errors.categories && <span className="field-error">{errors.categories}</span>}
            </div>
            <div className="field-row">
              {form.categories.length > 1 && (
                <label className="field">
                  Categoría principal <span className="muted small">(la que se ve en la tarjeta)</span>
                  <select
                    value={form.categories[0]}
                    onChange={(e) =>
                      set('categories', [e.target.value, ...form.categories.filter((s) => s !== e.target.value)])
                    }
                  >
                    {form.categories.map((slug) => (
                      <option key={slug} value={slug}>{categories.find((c) => c.slug === slug)?.name ?? slug}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                Material
                <select value={form.material} onChange={(e) => set('material', e.target.value as Material)}>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Fotos */}
          <fieldset className="panel">
            <legend>Fotos <span className="muted small">({form.images.length}/{MAX_IMAGES}) · la primera es la principal</span></legend>
            {form.images.length > 0 && (
              <div className="image-grid">
                {form.images.map((src, i) => (
                  <div key={i} className={`image-item ${i === 0 ? 'main' : ''}`}>
                    <img src={src} alt={`Foto ${i + 1}`} />
                    {i === 0 && <span className="image-main-tag">Principal</span>}
                    <div className="image-tools">
                      {i > 0 && (
                        <button type="button" onClick={() => moveImage(i, 0)} title="Hacer principal">★</button>
                      )}
                      {i > 0 && (
                        <button type="button" onClick={() => moveImage(i, i - 1)} title="Mover a la izquierda" aria-label="Mover a la izquierda">‹</button>
                      )}
                      {i < form.images.length - 1 && (
                        <button type="button" onClick={() => moveImage(i, i + 1)} title="Mover a la derecha" aria-label="Mover a la derecha">›</button>
                      )}
                      <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} title="Quitar" aria-label="Quitar foto">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.images.length < MAX_IMAGES && (
              <>
                <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                  <Icon name="image" size={28} />
                  <span>{uploading ? 'Procesando fotos…' : 'Arrastra fotos aquí o haz clic para elegirlas'}</span>
                  <span className="muted small">JPG, PNG o WEBP. Se reducen automáticamente.</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
                <div className="url-row">
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addImageUrl()
                      }
                    }}
                    placeholder="…o pega la URL de una imagen (ej. /productos/dragon.jpg)"
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addImageUrl}>Agregar</button>
                </div>
              </>
            )}
          </fieldset>

          {/* Colores */}
          <fieldset className="panel">
            <legend>Colores disponibles *</legend>
            <div className="color-list">
              {form.colors.map((c, i) => (
                <div key={i} className="color-item">
                  <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} aria-label={`Color ${i + 1}`} />
                  <code>{c}</code>
                  <button type="button" onClick={() => removeColor(i)} aria-label="Quitar color"><Icon name="close" size={14} /></button>
                </div>
              ))}
              <button type="button" className="color-add" onClick={() => addColor()}>
                <Icon name="plus" size={16} /> Agregar
              </button>
            </div>
            <div className="color-presets">
              <span className="muted small">Rápidos:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch sm preset"
                  style={{ background: c }}
                  onClick={() => addColor(c)}
                  aria-label={`Agregar color ${c}`}
                  disabled={form.colors.includes(c)}
                />
              ))}
            </div>
            {errors.colors && <span className="field-error">{errors.colors}</span>}
          </fieldset>

          {/* Costos: primero, porque de aquí sale el precio sugerido */}
          <fieldset className="panel">
            <legend>Costo <span className="muted small">(solo lo ves tú)</span></legend>
            <div className="field-row field-row-3">
              <label className="field">
                Gramos por pieza
                <input type="number" min={0} step={0.5} inputMode="decimal" value={form.grams} onChange={(e) => set('grams', e.target.value)} placeholder="Ej: 11" />
                {errors['cost.grams'] && <span className="field-error">{errors['cost.grams']}</span>}
              </label>
              <label className="field">
                Horas del lote
                <input type="number" min={0} step={0.5} inputMode="decimal" value={form.batchHours} onChange={(e) => set('batchHours', e.target.value)} placeholder="Ej: 7" />
                {errors['cost.batchHours'] && <span className="field-error">{errors['cost.batchHours']}</span>}
              </label>
              <label className="field">
                Piezas del lote
                <input type="number" min={1} step={1} inputMode="numeric" value={form.batchPieces} onChange={(e) => set('batchPieces', e.target.value)} />
                {errors['cost.batchPieces'] && <span className="field-error">{errors['cost.batchPieces']}</span>}
              </label>
            </div>
            <p className="muted small field-hint">Si imprimes varias a la vez, pon el tiempo total y cuántas salen.</p>

            <AccessoryPicker value={form.accessories} catalog={accessoryCatalog} onChange={(v) => set('accessories', v)} />

            {costSettings && cost && <CostLines cost={cost} />}
          </fieldset>

          {/* Precio y stock */}
          <fieldset className="panel">
            <legend>Precio y stock</legend>
            <div className="field-row">
              <label className="field">
                {form.onSale ? 'Precio de oferta *' : 'Precio *'}
                <input type="number" min={0} step={10} inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Ej: 1000" />
                {errors.price && <span className="field-error">{errors.price}</span>}
              </label>
              <div className="field">
                Stock
                {existing ? (
                  <>
                    <input value={`${existing.stock ?? 0} unidades`} readOnly disabled />
                    <span className="muted small">
                      Cambia con entregas aceptadas y ventas.{' '}
                      <Link to={`/admin/entregas?producto=${encodeURIComponent(existing.id)}`}>Entregar unidades</Link>
                    </span>
                  </>
                ) : (
                  <>
                    <input value="0 unidades" readOnly disabled />
                    <span className="muted small">Parte en 0. Después de crearlo, entrega las unidades impresas y se suman al aceptarlas.</span>
                  </>
                )}
              </div>
            </div>

            {costSettings && cost && (
              <div className="price-helper">
                <span>
                  Sugerido <strong>{formatPrice(cost.suggested)}</strong>
                  <span className="muted small"> (costo × {costSettings.priceMultiplier})</span>
                </span>
                {price !== cost.suggested && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('price', String(cost.suggested))}>
                    Usar
                  </button>
                )}
                {sale && (
                  <span className={`price-helper-profit ${sale.profit < 0 ? 'is-loss' : ''}`}>
                    Ganas {formatCost(sale.profit)} por pieza <span className="muted small">({Math.round(sale.margin * 100)}%, ya descontado el {costSettings.machineReservePercent}% de la máquina)</span>
                  </span>
                )}
              </div>
            )}
            {sale && sale.profit < 0 && <div className="alert">Con este precio pierdes dinero en cada venta.</div>}

            <label className="toggle">
              <input type="checkbox" checked={form.onSale} onChange={(e) => set('onSale', e.target.checked)} />
              <span>Está en oferta <span className="muted small">(muestra el precio anterior tachado)</span></span>
            </label>
            {form.onSale && (
              <label className="field">
                Precio anterior (sin oferta)
                <input type="number" min={0} step={10} inputMode="numeric" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="Ej: 1500" />
                {errors.oldPrice && <span className="field-error">{errors.oldPrice}</span>}
              </label>
            )}
          </fieldset>

          {/* Datos opcionales para la ficha de la tienda */}
          <details className="panel more-details" open={!!(form.heightCm || form.printHours) || !!errors.heightCm || !!errors.printHours}>
            <summary>Más detalles <span className="muted small">(opcional · se muestran en la tienda)</span></summary>
            <div className="field-row">
              <label className="field">
                Altura (cm)
                <input type="number" min={0} step={0.5} value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} placeholder="Ej: 12" />
                {errors.heightCm && <span className="field-error">{errors.heightCm}</span>}
              </label>
              <label className="field">
                Tiempo de impresión (h)
                <input type="number" min={0} step={0.5} value={form.printHours} onChange={(e) => set('printHours', e.target.value)} placeholder="Ej: 8" />
                {errors.printHours && <span className="field-error">{errors.printHours}</span>}
              </label>
            </div>
          </details>
        </div>
        <aside className="admin-form-side">
          <fieldset className="panel">
            <legend>Visibilidad</legend>
            <label className="toggle">
              <input type="checkbox" checked={!form.hidden} onChange={(e) => set('hidden', !e.target.checked)} />
              <span>Visible en la tienda</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} />
              <span>Marcar como nuevo</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={form.bestSeller} onChange={(e) => set('bestSeller', e.target.checked)} />
              <span>Más vendido / destacado</span>
            </label>
          </fieldset>

          <div className="panel preview">
            <span className="legend">Vista previa</span>
            <ProductCard product={preview} />
          </div>

          {saveError && <div className="alert">{saveError}</div>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={uploading || saving}>
              {saving ? 'Guardando…' : uploading ? 'Subiendo fotos…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <Link to="/admin/productos" className="btn btn-ghost btn-block">Cancelar</Link>
          </div>
        </aside>
      </form>
    </>
  )
}
