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
        <title>{`${pageTitle || title} — RatnaGiri Jewels`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-dvh bg-brand-linen-100 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="relative h-[28vh] min-h-44 overflow-hidden bg-brand-forest-950 lg:sticky lg:top-0 lg:h-dvh">
          <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-forest-950/55 via-transparent to-brand-forest-950/30" />
          <Link
            to="/"
            className="absolute left-5 top-5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold-400 lg:left-10 lg:top-10"
          >
            <img src={logo} alt="RatnaGiri Jewels — home" className="h-12 w-auto rounded-full lg:h-16" />
          </Link>
        </aside>

        <main className="flex px-5 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-16 xl:px-24">
          <div className="w-full max-w-[400px]">
            <h1 className="font-display text-[2.5rem] font-medium leading-[1.05] text-brand-forest-950 sm:text-5xl">
              {title}
            </h1>
            {intro && <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-brand-forest-900/75">{intro}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-brand-forest-900/10 pt-6 text-sm text-brand-forest-900/80">{footer}</div>}
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
      className="font-medium text-brand-forest-800 underline decoration-brand-gold-500/70 underline-offset-4 hover:text-brand-forest-950 hover:decoration-brand-gold-500 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-brand-gold-500"
    >
      {children}
    </Link>
  )
}
