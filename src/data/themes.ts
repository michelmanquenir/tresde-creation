// Temas de color inspirados en materiales de impresión 3D.
// Los colores completos de cada tema están en index.css ([data-theme='...']);
// aquí solo los necesarios para dibujar la muestra en el selector.
export const THEMES = [
  { id: 'naranja', name: 'Naranja filamento', mode: 'claro', accent: '#ff5a1f', base: '#faf8f5', dark: '#1d1b2e' },
  { id: 'cian', name: 'Cian resina', mode: 'claro', accent: '#00bcd9', base: '#f3f8fa', dark: '#072a35' },
  { id: 'magenta', name: 'Magenta silk', mode: 'claro', accent: '#e6007e', base: '#fdf6fa', dark: '#2a0b1e' },
  { id: 'ambar', name: 'Ámbar PETG', mode: 'claro', accent: '#ffc21a', base: '#fffbef', dark: '#211b0c' },
  { id: 'neon', name: 'Verde neón', mode: 'oscuro', accent: '#39ff88', base: '#0b100d', dark: '#060907' },
  { id: 'galaxia', name: 'Violeta galaxia', mode: 'oscuro', accent: '#b77bff', base: '#110e22', dark: '#09071a' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'naranja'
