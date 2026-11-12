import { Helmet } from 'react-helmet-async'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/media/img/logo.webp'
import { logout, selectAuth } from '../../store/authSlice'

const NAV = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/collections', label: 'Collections' },
  { to: '/admin/activity', label: 'Activity' },
]

/**
 * Admin shell + guard. The UI check is for routing only — every admin API call is
 * authorised again on the server from the database role (NFR-S10).
 */
export default function AdminLayout() {
  const { user, status } = useSelector(selectAuth)
  const location = useLocation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  if (status === 'unknown') return <div data-theme="light" className="min-h-dvh bg-ground" />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'admin') return <Navigate to="/account" replace />

  async function signOut() {
    await dispatch(logout())
    navigate('/', { replace: true })
  }

  return (
    <>
      <Helmet>
        <title>Admin | RatnaGiri Jewels</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div data-theme="light" className="min-h-dvh bg-ground text-ink">
        <header className="sticky top-0 z-30 bg-brand-forest-950 text-brand-linen-100">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <Link to="/admin/products" className="flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-brand-gold-300">
              <img src={logo} alt="" className="h-9 w-auto rounded-full" />
              <span className="hidden font-display text-xl sm:inline">Admin</span>
            </Link>
            <nav aria-label="Admin" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-gold-300 ${
                      isActive ? 'border-brand-gold-300 text-brand-gold-300' : 'border-transparent text-brand-linen-100/80 hover:text-brand-linen-100'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <Link to="/" className="hidden shrink-0 text-sm text-brand-linen-100/80 hover:text-brand-linen-100 md:inline">
              View shop
            </Link>
            <button type="button" onClick={signOut} className="shrink-0 px-3 py-2 text-sm text-brand-linen-100/80 hover:text-brand-linen-100 focus-visible:outline-2 focus-visible:outline-brand-gold-300">
              Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-medium leading-none text-ink sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-[60ch] text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export function Panel({ title, description, children, className = '' }) {
  return (
    <section className={`border border-line bg-raised p-5 sm:p-6 ${className}`}>
      {title && <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={title || description ? 'mt-5' : ''}>{children}</div>
    </section>
  )
}

const STATUS_STYLES = {
  active: 'bg-ink/10 text-ink',
  draft: 'bg-gold/15 text-gold',
  archived: 'bg-ink/5 text-muted',
}

export function StatusBadge({ status }) {
  const label = { active: 'Live', draft: 'Draft', archived: 'Archived' }[status] || status
  return <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] || ''}`}>{label}</span>
}
