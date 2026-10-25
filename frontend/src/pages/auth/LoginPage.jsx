import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { authApi } from '../../api/auth'
import ringsImg from '../../assets/media/img/collection-1-rings.webp'
import AuthLayout, { TextLink } from '../../components/auth/AuthLayout'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { PasswordField } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import { formatWhen } from '../../lib/formatWhen'
import { signedIn } from '../../store/authSlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const { state } = useLocation()
  const [form, setForm] = useState({ email: typeof state?.email === 'string' ? state.email : '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState(null) // set when the 2-device limit is hit
  const [revoking, setRevoking] = useState(null)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function signIn(revokeSessionId) {
    setError(null)
    try {
      const { user } = await authApi.login({ ...form, ...(revokeSessionId && { revokeSessionId }) })
      dispatch(signedIn(user)) // GuestOnly then sends the user to state.from or /account
    } catch (err) {
      const e = readError(err)
      if (e.code === 'SESSION_LIMIT') {
        setSessions(e.details.sessions)
      } else {
        setSessions(null)
        setError(e)
      }
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await signIn()
    setLoading(false)
  }

  async function revokeAndContinue(id) {
    setRevoking(id)
    await signIn(id)
    setRevoking(null)
  }

  if (sessions) {
    return (
      <AuthLayout
        pageTitle="Sign in"
        title="You're signed in on two devices"
        intro="For your security, an account can stay signed in on two devices at a time. Sign out of one to continue here."
        image={ringsImg}
      >
        <ul className="divide-y divide-brand-forest-900/10 border-y border-brand-forest-900/10">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium text-brand-forest-950">{s.deviceLabel}</p>
                <p className="text-[13px] text-brand-forest-900/65">Signed in {formatWhen(s.createdAt)}, last active {formatWhen(s.lastUsedAt)}</p>
              </div>
              <Button
                variant="outline"
                className="h-10 shrink-0 px-5 text-sm"
                loading={revoking === s.id}
                disabled={Boolean(revoking)}
                onClick={() => revokeAndContinue(s.id)}
              >
                Sign out there
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-4">
          <FormMessage>{error?.message}</FormMessage>
          <button
            type="button"
            onClick={() => setSessions(null)}
            className="text-sm font-medium text-brand-forest-800 underline decoration-brand-gold-500/70 underline-offset-4 hover:text-brand-forest-950 focus-visible:outline-2 focus-visible:outline-brand-gold-500"
          >
            Cancel and stay signed out here
          </button>
        </div>
      </AuthLayout>
    )
  }

  const fields = error?.fields || {}

  return (
    <AuthLayout
      title="Sign in"
      intro="Welcome back. Sign in to see your orders and saved addresses."
      image={ringsImg}
      footer={
        <>
          New to RatnaGiri Jewels? <TextLink to="/register">Create an account</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {state?.reset && <FormMessage tone="info">Password updated. Sign in with your new password.</FormMessage>}
        {state?.sessionEnded && !state?.reset && (
          <FormMessage tone="info">You were signed out on this device. Please sign in again to continue.</FormMessage>
        )}
        {error && !Object.keys(fields).length && (
          <FormMessage>
            {error.message}
            {error.code === 'ACCOUNT_NOT_VERIFIED' && (
              <>
                {' '}
                <TextLink to="/register">Register again</TextLink> with the same email to get a new code.
              </>
            )}
          </FormMessage>
        )}
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={fields.email} required />
        <div>
          <PasswordField autoComplete="current-password" value={form.password} onChange={update('password')} error={fields.password} required />
          <p className="mt-2 text-right text-sm">
            <TextLink to="/forgot-password">Forgot password?</TextLink>
          </p>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
