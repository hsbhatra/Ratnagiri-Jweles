import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { selectAuth } from '../../store/authSlice'

/** Small fixed link over the storyboard — readable on both dark video and light sections. */
export default function AccountLink() {
  const { status, user } = useSelector(selectAuth)
  if (status === 'unknown') return null
  const signedIn = status === 'authenticated'
  return (
    <Link
      to={signedIn ? '/account' : '/login'}
      className="fixed right-4 top-4 z-50 rounded-full bg-brand-forest-950/70 px-5 py-2.5 text-sm font-medium text-brand-linen-100 backdrop-blur-sm transition-colors hover:bg-brand-forest-950/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400 sm:right-6 sm:top-6"
    >
      {signedIn ? `Hi, ${user.name.split(' ')[0]}` : 'Sign in'}
    </Link>
  )
}
