import { useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { categories, MATERIALS, type Material, type Product } from '../data/catalog'
import { useProducts } from '../context/ProductsContext'
import { resizeImage } from '../utils/image'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

const MAX_IMAGES = 6
const PRESET_COLORS = ['#f4f1ea', '#2b2b2b', '#bdbdbd', '#e8443a', '#e86a3a', '#f2c14e', '#1e9e6a', '#3a7be8', '#7b4bd6', '#d4af37']

type FormState = {
  name: string
  category: string
  price: string
  oldPrice: string
  description: string
  material: Material
  heightCm: string
  printHours: string
  colors: string[]
  images: string[]
  isNew: boolean
  bestSeller: boolean
  hidden: boolean
}

const emptyForm: FormState = {
  name: '',
  category: 'figuras',
  price: '',
  oldPrice: '',
  description: '',
  material: 'PLA',
  heightCm: '',
  printHours: '',
  colors: ['#bdbdbd'],
  images: [],
  isNew: true,
  bestSeller: false,
  hidden: false,
}

const toForm = (p: Product): FormState => ({
  name: p.name,
  category: p.category,
  price: String(p.price),
  oldPrice: p.oldPrice ? String(p.oldPrice) : '',
  description: p.description,
  material: p.material,
  heightCm: p.heightCm ? String(p.heightCm) : '',
  printHours: p.printHours ? String(p.printHours) : '',
  colors: p.colors.length ? p.colors : ['#bdbdbd'],
  images: p.images ?? [],
  isNew: !!p.isNew,
  bestSeller: !!p.bestSeller,
  hidden: !!p.hidden,
})

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

export default function AdminProductForm() {
  const { id } = useParams()
  const { getProduct, saveProduct, newId } = useProducts()
  const navigate = useNavigate()
  const existing = getProduct(id)
  const isEdit = !!id

  const [form, setForm] = useState<FormState>(() => (existing ? toForm(existing) : emptyForm))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  if (isEdit && !existing) {
    return (
      <div className="empty">
        <h1>Producto no encontrado</h1>
        <Link to="/admin" className="btn btn-primary">Volver al listado</Link>
      </div>
    )
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  // ── Imágenes ──
  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const room = MAX_IMAGES - form.images.length
    if (!list.length || room <= 0) return
    setUploading(true)
    try {
      const resized = await Promise.all(list.slice(0, room).map((f) => resizeImage(f)))
      setForm((f) => ({ ...f, images: [...f.images, ...resized].slice(0, MAX_IMAGES) }))
    } catch {
      setSaveError('No se pudo procesar una de las imágenes.')
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
  const toProduct = (): Product => ({
    id: existing?.id ?? (newId(form.name || 'producto')),
    name: form.name.trim(),
    category: form.category,
    price: Number(form.price) || 0,
    oldPrice: num(form.oldPrice),
    description: form.description.trim(),
    material: form.material,
    heightCm: num(form.heightCm),
    printHours: num(form.printHours),
    colors: form.colors,
    images: form.images,
    isNew: form.isNew,
    bestSeller: form.bestSeller,
    hidden: form.hidden,
    rating: existing?.rating,
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Escribe un nombre.'
    if (!(Number(form.price) > 0)) e.price = 'El precio debe ser mayor a 0.'
    if (form.oldPrice && !(Number(form.oldPrice) > Number(form.price)))
      e.oldPrice = 'El precio anterior debe ser mayor al precio actual.'
    if (!form.description.trim()) e.description = 'Agrega una descripción.'
    if (!form.colors.length) e.colors = 'Agrega al menos un color.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (!validate()) return
    const product = toProduct()
    try {
      saveProduct(product)
      navigate('/admin', { state: { saved: product.name } })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  const preview = { ...toProduct(), name: form.name || 'Nombre del producto' }

  return (
    <>
      <Link to="/admin" className="back-link"><Icon name="back" size={16} /> Volver a productos</Link>
      <div className="admin-title">
        <h1>{isEdit ? `Editar: ${existing?.name}` : 'Nuevo producto'}</h1>
      </div>

      <form className="admin-form" onSubmit={onSubmit} noValidate>
        <div className="admin-form-main">
          {/* Información básica */}
          <fieldset className="panel">
            <legend>Información</legend>
            <label className="field">
              Nombre *
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Dragón articulado" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label className="field">
              Descripción *
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tamaño, detalles, si viene pintada o lista para pintar…"
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </label>
            <div className="field-row">
              <label className="field">
                Categoría
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
              <label className="field">
                Material
                <select value={form.material} onChange={(e) => set('material', e.target.value as Material)}>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Precio y detalles */}
          <fieldset className="panel">
            <legend>Precio y detalles</legend>
            <div className="field-row">
              <label className="field">
                Precio *
                <input type="number" min={0} step={10} inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="18990" />
                {errors.price && <span className="field-error">{errors.price}</span>}
              </label>
              <label className="field">
                <span>Precio anterior <span className="muted small">(oferta, opcional)</span></span>
                <input type="number" min={0} step={10} inputMode="numeric" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} />
                {errors.oldPrice && <span className="field-error">{errors.oldPrice}</span>}
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                Altura (cm)
                <input type="number" min={0} step={0.5} value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} placeholder="12" />
              </label>
              <label className="field">
                Horas de impresión
                <input type="number" min={0} step={0.5} value={form.printHours} onChange={(e) => set('printHours', e.target.value)} placeholder="8" />
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
            <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <Link to="/admin" className="btn btn-ghost btn-block">Cancelar</Link>
          </div>
        </aside>
      </form>
    </>
  )
}
