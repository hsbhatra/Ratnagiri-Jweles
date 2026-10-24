import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import necklaceImg from '../../assets/media/img/collection-4-necklace-layered.webp'
import AuthLayout, { TextLink } from '../../components/auth/AuthLayout'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { PasswordField } from '../../components/ui/Field'
import { pendingRegistration, readError } from '../../lib/authHelpers'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.register(form)
      const pending = { email: result.email, registrationToken: result.registrationToken, resendAfterSec: result.resendAfterSec }
      pendingRegistration.set(pending)
      navigate('/verify-email', { state: pending })
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  const fields = error?.fields || {}

  return (
    <AuthLayout
      title="Create your account"
      intro="You'll need an account to check out, track orders and save addresses."
      image={necklaceImg}
      footer={
        <>
          Already have an account? <TextLink to="/login">Sign in</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && !Object.keys(fields).length && (
          <FormMessage>
            {error.message}
            {error.code === 'EMAIL_TAKEN' && (
              <>
                {' '}
                <TextLink to="/login">Sign in</TextLink> or <TextLink to="/forgot-password">reset your password</TextLink>.
              </>
            )}
          </FormMessage>
        )}
        <Field label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={fields.name} required />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={fields.email}
          hint="We'll send a 6-digit code here to confirm it's yours."
          required
        />
        <Field
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={update('phone')}
          error={fields.phone}
          hint="Include your country code. Used by the courier for delivery."
          required
        />
        <PasswordField
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={fields.password}
          hint="At least 8 characters, with a letter and a number."
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
