import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { safeRedirect } from '../../lib/authHelpers'
import { selectAuth } from '../../store/authSlice'

function Waiting() {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-linen-100" role="status">
      <span className="size-6 animate-spin rounded-full border-2 border-brand-forest-900 border-r-transparent" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

/** Signed-in only. The backend still checks every request; this just routes the UI. */
export function RequireAuth() {
  const { status, sessionEnded } = useSelector(selectAuth)
  const location = useLocation()
  if (status === 'unknown') return <Waiting />
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname, sessionEnded }} />
  }
  return <Outlet />
}

/** Signed-out only (login/register): signed-in visitors go to their account. */
export function GuestOnly() {
  const { status } = useSelector(selectAuth)
  const location = useLocation()
  if (status === 'unknown') return <Waiting />
  // Honour "sign in to continue" (e.g. from checkout) instead of always going to /account
  if (status === 'authenticated') return <Navigate to={safeRedirect(location.state?.from)} replace />
  return <Outlet />
}
