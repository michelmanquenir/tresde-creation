import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { THEMES } from '../data/themes'
import Icon from './Icon'

/** Botón con paleta que abre la lista de temas de color. */
export default function ThemePicker({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  // Cerrar con clic afuera o con Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`theme-picker ${className}`} ref={ref}>
      <button
        type="button"
        className="icon-btn theme-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Cambiar tema de color (actual: ${current.name})`}
        title="Tema de color"
      >
        <Icon name="palette" />
        <span className="theme-dot" style={{ background: current.accent }} aria-hidden="true" />
      </button>

      {open && (
        <div className="theme-menu" role="menu" aria-label="Temas de color">
          <p className="theme-menu-title">Tema de color</p>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={t.id === theme}
                className={`theme-option ${t.id === theme ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setOpen(false)
                }}
              >
                <span
                  className="theme-swatch"
                  style={{ background: `linear-gradient(135deg, ${t.base} 0 48%, ${t.dark} 48% 100%)` }}
                  aria-hidden="true"
                >
                  <span className="theme-swatch-accent" style={{ background: t.accent }} />
                  {t.id === theme && <Icon name="check" size={14} className="theme-check" />}
                </span>
                <span className="theme-name">{t.name}</span>
                <span className="theme-mode">{t.mode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
