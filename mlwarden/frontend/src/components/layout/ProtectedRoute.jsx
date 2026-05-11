import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/useAuth.js'
import { LoadingState } from '@/components/common/LoadingState.jsx'

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingState message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
