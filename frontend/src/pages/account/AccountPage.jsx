import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, userApi } from '../../api/auth'
import logo from '../../assets/media/img/logo.webp'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { inputClass } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import { formatWhen } from '../../lib/formatWhen'
import { logout, selectAuth, userUpdated, welcomeShown } from '../../store/authSlice'
import AddressBook from './AddressBook'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD']

function Section({ title, description, children }) {
  return (
    <section className="border-t border-brand-forest-900/10 py-10 md:grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-12">
      <div className="mb-6 md:mb-0">
        <h2 className="font-display text-[1.75rem] font-medium leading-tight text-brand-forest-950">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-brand-forest-900/70">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function ProfileForm({ user }) {
  const dispatch = useDispatch()
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', preferredCurrency: user.preferredCurrency || '' })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const update = (key) => (e) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { user: next } = await userApi.updateProfile({ ...form, preferredCurrency: form.preferredCurrency || null })
      dispatch(userUpdated(next))
      setSaved(true)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  const fields = error?.fields || {}
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={fields.name} />
      <Field label="Email" value={user.email} readOnly disabled hint="Your email is your sign-in and can't be changed here." />
      <Field label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} error={fields.phone} />
      <Field label="Currency" error={fields.preferredCurrency} hint="Prices are shown in this currency.">
        {({ id, describedBy }) => (
          <select id={id} aria-describedby={describedBy} value={form.preferredCurrency} onChange={update('preferredCurrency')} className={inputClass}>
            <option value="">Automatic, based on your location</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>
      {error && !Object.keys(fields).length && <FormMessage>{error.message}</FormMessage>}
      <div className="flex items-center gap-4">
        <Button type="submit" loading={loading}>
          Save changes
        </Button>
        {saved && (
          <p role="status" className="text-sm text-brand-forest-800">
            Saved
          </p>
        )}
      </div>
    </form>
  )
}

function Devices() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      setSessions((await authApi.sessions()).sessions)
    } catch (err) {
      setError(readError(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function signOutDevice(id) {
    setBusy(id)
    setError(null)
    try {
      await authApi.revokeSession(id)
      await load()
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(null)
    }
  }

  async function signOutEverywhere() {
    setBusy('all')
    await dispatch(logout({ everywhere: true }))
    navigate('/login', { replace: true })
  }

  if (!sessions && !error) return <p className="text-sm text-brand-forest-900/60">Loading devices…</p>

  return (
    <div>
      <FormMessage>{error?.message}</FormMessage>
      <ul className="divide-y divide-brand-forest-900/10">
        {sessions?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div className="min-w-0">
              <p className="font-medium text-brand-forest-950">
                {s.deviceLabel}
                {s.isCurrent && <span className="ml-2 text-sm font-normal text-brand-forest-800">(this device)</span>}
              </p>
              <p className="text-[13px] text-brand-forest-900/65">
                Signed in {formatWhen(s.createdAt)}, last active {formatWhen(s.lastUsedAt)}
              </p>
            </div>
            {!s.isCurrent && (
              <Button variant="outline" className="h-10 shrink-0 px-5 text-sm" loading={busy === s.id} disabled={Boolean(busy)} onClick={() => signOutDevice(s.id)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Button variant="danger" className="mt-6" loading={busy === 'all'} disabled={Boolean(busy)} onClick={signOutEverywhere}>
        Sign out of all devices
      </Button>
    </div>
  )
}

export default function AccountPage() {
  const { user, justRegistered } = useSelector(selectAuth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [welcome] = useState(justRegistered) // greet once, then it's a normal account page
  const firstName = user.name.split(' ')[0]

  useEffect(() => {
    if (justRegistered) dispatch(welcomeShown())
  }, [justRegistered, dispatch])

  async function signOut() {
    await dispatch(logout())
    navigate('/', { replace: true })
  }

  return (
    <>
      <Helmet>
        <title>Your account — RatnaGiri Jewels</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-dvh bg-brand-linen-100">
        <header className="bg-brand-forest-950">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
            <Link to="/" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold-400">
              <img src={logo} alt="RatnaGiri Jewels — home" className="h-11 w-auto rounded-full" />
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full px-4 py-2 text-sm font-medium text-brand-linen-100 hover:text-brand-gold-300 focus-visible:outline-2 focus-visible:outline-brand-gold-400"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-8">
          <h1 className="font-display text-[2.75rem] font-medium leading-none text-brand-forest-950 sm:text-6xl">
            {welcome ? `Welcome, ${firstName}` : `Hello, ${firstName}`}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-brand-forest-900/75">
            {welcome
              ? 'Your email is verified and your account is ready. Add a delivery address now to make checkout quicker later.'
              : 'Manage your details, delivery addresses and the devices you’re signed in on.'}
          </p>

          <div className="mt-12">
            <Section title="Your details" description="Used on your orders and invoices.">
              <ProfileForm user={user} />
            </Section>
            <Section title="Delivery addresses" description="Save up to five. The default is picked first at checkout.">
              <AddressBook addresses={user.addresses || []} />
            </Section>
            <Section title="Signed-in devices" description="You can be signed in on two devices at a time. Sign out of any you don’t recognise.">
              <Devices />
            </Section>
          </div>
        </main>
      </div>
    </>
  )
}
