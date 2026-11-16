import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canUsePanel } from '../auth/authService'

// Al panel entran administradores y trabajadores. Sin sesión (o con una cuenta de cliente)
// manda al login del panel y recuerda a dónde quería ir.
// adminOnly: secciones solo para el administrador (Usuarios, Configuración); un trabajador vuelve al inicio.
export default function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session } = useAuth()
  const location = useLocation()

  if (!canUsePanel(session?.role)) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (adminOnly && session?.role !== 'ADMIN') return <Navigate to="/admin" replace />
  return <>{children}</>
}
