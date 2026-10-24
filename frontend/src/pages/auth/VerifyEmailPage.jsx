import { useId, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { authApi } from '../../api/auth'
import earringsImg from '../../assets/media/img/collection-2-earrings.webp'
import AuthLayout, { TextLink } from '../../components/auth/AuthLayout'
import OtpInput from '../../components/auth/OtpInput'
import Button, { FormMessage } from '../../components/ui/Button'
import { pendingRegistration, readError } from '../../lib/authHelpers'
import useCountdown from '../../lib/useCountdown'
import { registered } from '../../store/authSlice'

export default function VerifyEmailPage() {
  const { state } = useLocation()
  const dispatch = useDispatch()
  const labelId = useId()
  const pending = state?.registrationToken ? state : pendingRegistration.get()

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useCountdown(pending?.resendAfterSec ?? 60)

  async function verify(value = code) {
    if (value.length !== 6 || loading) return
    setLoading(true)
    setError(null)
    try {
      const { user } = await authApi.verifyEmail({ email: pending.email, code: value, registrationToken: pending.registrationToken })
      pendingRegistration.clear()
      // GuestOnly redirects to /account as soon as we're authenticated
      dispatch(registered(user))
    } catch (err) {
      const e = readError(err)
      setError(e)
      if (e.code === 'OTP_LOCKED' || e.code === 'OTP_EXPIRED') setResendIn(0)
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  // Submit as soon as the 6th digit lands (also covers phone autofill)
  function onCodeChange(next) {
    setCode(next)
    if (next.length === 6) verify(next)
  }

  async function resend() {
    setError(null)
    setNotice(null)
    try {
      const result = await authApi.resendOtp({ email: pending.email, registrationToken: pending.registrationToken })
      setNotice(`A new code is on its way to ${pending.email}.`)
      setResendIn(result.resendAfterSec)
    } catch (err) {
      const e = readError(err)
      setError(e)
      if (e.details.retryAfterSec) setResendIn(e.details.retryAfterSec)
    }
  }

  if (!pending?.email) return <Navigate to="/register" replace />

  const expired = error?.code === 'REGISTRATION_EXPIRED'

  return (
    <AuthLayout
      title="Check your email"
      intro={
        <>
          We sent a 6-digit code to <strong className="font-medium text-brand-forest-950">{pending.email}</strong>. It
          expires in 10 minutes.
        </>
      }
      image={earringsImg}
      footer={
        <>
          Wrong email? <TextLink to="/register">Start again</TextLink>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          verify()
        }}
        className="space-y-6"
      >
        <div>
          <p id={labelId} className="mb-2 text-sm font-medium text-brand-forest-900">
            Verification code
          </p>
          <OtpInput value={code} onChange={onCodeChange} invalid={Boolean(error)} disabled={loading || expired} labelId={labelId} />
        </div>

        {error && (
          <FormMessage>
            {error.message}
            {expired && (
            <>
              {' '}
              <TextLink to="/register">Register again</TextLink>
              </>
            )}
          </FormMessage>
        )}
        <FormMessage tone="info">{notice}</FormMessage>

        <Button type="submit" loading={loading} disabled={code.length !== 6 || expired} className="w-full">
          Verify email
        </Button>

        <p className="text-sm text-brand-forest-900/75">
          Didn't get it? Check your spam folder, or{' '}
          {resendIn > 0 ? (
            <span>request a new code in {resendIn}s.</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={expired}
              className="font-medium text-brand-forest-800 underline decoration-brand-gold-500/70 underline-offset-4 hover:text-brand-forest-950 focus-visible:outline-2 focus-visible:outline-brand-gold-500 disabled:opacity-50"
            >
              send a new code
            </button>
          )}
        </p>
      </form>
    </AuthLayout>
  )
}
