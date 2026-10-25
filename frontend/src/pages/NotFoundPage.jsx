import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import logo from '../assets/media/img/logo.webp'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page not found — RatnaGiri Jewels</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-forest-950 px-6 text-center text-brand-linen-100">
        <img src={logo} alt="" className="mb-10 h-16 w-auto rounded-full" />
        <p className="text-sm tracking-[0.3em] text-brand-gold-300 uppercase">404</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">This page has wandered off.</h1>
        <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-brand-linen-100/75">
          The link may be old or mistyped. Let’s get you back to the jewellery.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-brand-linen-100 px-7 py-3 text-[15px] font-medium text-brand-forest-950 hover:bg-brand-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400"
          >
            Back to home
          </Link>
          <Link
            to="/account"
            className="rounded-full border border-brand-linen-100/40 px-7 py-3 text-[15px] font-medium hover:border-brand-linen-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-400"
          >
            Your account
          </Link>
        </div>
      </main>
    </>
  )
}
