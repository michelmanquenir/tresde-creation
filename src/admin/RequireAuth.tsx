import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Solo el administrador entra al panel. Sin sesión (o con una cuenta de cliente)
// manda al login del panel y recuerda a dónde quería ir.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()

  if (session?.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}
