import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import logo from '../assets/media/img/logo.webp'
import { selectAuth } from '../store/authSlice'

const link =
  'py-2 text-ink/85 transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold'

/** Shop header. `overlay` lays it over a full-bleed photo or film (the home page). */
export default function SiteHeader({ overlay = false }) {
  const { status, user } = useSelector(selectAuth)
  const signedIn = status === 'authenticated'
  return (
    <header className={`${overlay ? 'absolute inset-x-0 top-0 z-40' : ''} border-b border-gold/40 text-ink`}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 text-sm sm:gap-7 sm:px-8">
        <Link to="/" className="mr-auto flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <img src={logo} alt="" className="size-10 rounded-full" />
          <span className="sr-only font-display text-xl sm:not-sr-only">RatnaGiri Jewels</span>
        </Link>
        <nav aria-label="Shop" className="flex gap-4 sm:gap-7">
          <Link to="/collections" className={link}>
            Collections
          </Link>
          <a href="/#stones" className={link}>
            Stones
          </a>
          <a href="/#promise" className={`${link} hidden sm:inline`}>
            Our promise
          </a>
        </nav>
        {status !== 'unknown' && (
          <Link to={signedIn ? '/account' : '/login'} className={`${link} font-medium text-gold`}>
            {signedIn ? `Hi, ${user.name.split(' ')[0]}` : 'Sign in'}
          </Link>
        )}
      </div>
    </header>
  )
}
