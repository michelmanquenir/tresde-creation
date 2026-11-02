import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_THEME, THEMES, type ThemeId } from '../data/themes'

// La misma clave la lee el script de index.html para aplicar el tema antes de pintar (sin parpadeo).
const STORAGE_KEY = 'tresd-theme'

const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value)

function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isTheme(saved)) return saved
  } catch {
    /* sin acceso al almacenamiento */
  }
  return DEFAULT_THEME
}

type ThemeValue = { theme: ThemeId; setTheme: (id: ThemeId) => void }

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(loadTheme)

  // Sincroniza el tema con <html data-theme> (sistema externo al árbol de React)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    const info = THEMES.find((t) => t.id === theme)
    if (meta && info) meta.setAttribute('content', info.dark)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* sin acceso al almacenamiento */
    }
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
