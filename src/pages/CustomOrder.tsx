import { useState, type FormEvent } from 'react'
import Icon from '../components/Icon'

export default function CustomOrder() {
  const [sent, setSent] = useState(false)
  const [fileName, setFileName] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // TODO: enviar a tu backend (FormData con el archivo)
    setSent(true)
  }

  return (
    <div className="container page narrow">
      <header className="page-head">
        <h1>Pedido a medida</h1>
        <p className="muted">
          Cuéntanos qué necesitas o sube tu archivo 3D. Te respondemos con una cotización en menos de 24 horas.
        </p>
      </header>

      {sent ? (
        <div className="empty">
          <Icon name="sparkle" size={36} />
          <h2>¡Solicitud recibida!</h2>
          <p className="muted">Te escribiremos pronto con la cotización.</p>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit}>
          <div className="form-row">
            <label>Nombre<input required name="nombre" /></label>
            <label>Correo<input required type="email" name="email" /></label>
          </div>
          <label>
            Describe tu pieza
            <textarea required name="descripcion" rows={5} placeholder="Medidas aproximadas, uso, color preferido…" />
          </label>
          <div className="form-row">
            <label>
              Material
              <select name="material" defaultValue="">
                <option value="">No estoy seguro</option>
                <option>PLA</option>
                <option>PETG</option>
                <option>TPU (flexible)</option>
                <option>Resina (alto detalle)</option>
              </select>
            </label>
            <label>Cantidad<input type="number" min={1} defaultValue={1} name="cantidad" /></label>
          </div>
          <label className="dropzone">
            <Icon name="upload" size={28} />
            <span>{fileName || 'Sube tu archivo STL, OBJ o 3MF (opcional)'}</span>
            <input
              type="file"
              accept=".stl,.obj,.3mf,image/*"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </label>
          <button className="btn btn-primary">Solicitar cotización</button>
        </form>
      )}
    </div>
  )
}
