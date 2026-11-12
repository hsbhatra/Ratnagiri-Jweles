import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import logo from '../../assets/media/img/logo.webp'

/**
 * Split layout: a product photograph on one side (a different piece per page), the
 * form on the other. On phones the photo becomes a short band above the form.
 */
export default function AuthLayout({ title, intro, image, imageAlt = '', pageTitle, children, footer }) {
  return (
    <>
      <Helmet>
        <title>{`${pageTitle || title} | RatnaGiri Jewels`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="relative h-[28vh] min-h-44 overflow-hidden border-b border-gold/40 bg-brand-forest-950 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
          <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-forest-950/60 via-transparent to-brand-forest-950/40" />
          <Link
            to="/"
            className="absolute left-5 top-5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold lg:left-10 lg:top-10"
          >
            <img src={logo} alt="RatnaGiri Jewels, home" className="h-12 w-auto rounded-full lg:h-16" />
          </Link>
        </aside>

        <main className="flex px-5 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-16 xl:px-24">
          <div className="w-full max-w-[400px]">
            <h1 className="font-display text-[2.5rem] leading-[1.05] text-balance text-ink sm:text-5xl">{title}</h1>
            {intro && <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-muted">{intro}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
          </div>
        </main>
      </div>
    </>
  )
}

export function TextLink({ to, children }) {
  return (
    <Link
      to={to}
      className="font-medium text-gold underline decoration-gold/70 underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold"
    >
      {children}
    </Link>
  )
}
