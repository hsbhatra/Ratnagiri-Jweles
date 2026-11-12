import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { buttonClass } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page not found | RatnaGiri Jewels</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <SiteHeader />
      <main className="mx-auto flex min-h-[75dvh] max-w-6xl flex-col justify-center px-5 py-20 sm:px-8">
        <h1 className="max-w-[14ch] font-display text-5xl text-balance text-ink md:text-7xl">This page has wandered off.</h1>
        <p className="mt-5 max-w-[40ch] text-[17px] leading-relaxed text-muted">
          Error 404. The link may be old or mistyped. Let’s get you back to the jewellery.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className={buttonClass()}>
            Back to home
          </Link>
          <Link to="/account" className={buttonClass('outline')}>
            Your account
          </Link>
        </div>
      </main>
    </>
  )
}
