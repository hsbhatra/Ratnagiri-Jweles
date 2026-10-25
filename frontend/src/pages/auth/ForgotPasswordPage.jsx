import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import braceletImg from '../../assets/media/img/collection-3-bracelet-stack.webp'
import AuthLayout, { TextLink } from '../../components/auth/AuthLayout'
import OtpInput from '../../components/auth/OtpInput'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { PasswordField } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import useCountdown from '../../lib/useCountdown'

/** FR2.5: email → 6-digit code → new password, all on one page (no emailed links). */
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const labelId = useId()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useCountdown(0)

  async function requestCode(e) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const result = await authApi.forgotPassword({ email })
      setStep('reset')
      setResendIn(result.resendAfterSec)
      if (e === undefined) setNotice('A new code is on its way.')
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  async function reset(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.resetPassword({ email, code, newPassword })
      navigate('/login', { replace: true, state: { reset: true, email } })
    } catch (err) {
      const er = readError(err)
      setError(er)
      if (['OTP_INVALID', 'OTP_LOCKED', 'OTP_EXPIRED'].includes(er.code)) setCode('')
      if (er.code === 'OTP_LOCKED' || er.code === 'OTP_EXPIRED') setResendIn(0)
    } finally {
      setLoading(false)
    }
  }

  const fields = error?.fields || {}
  const generalError = error && !Object.keys(fields).length ? error.message : null

  if (step === 'email') {
    return (
      <AuthLayout
        title="Reset your password"
        intro="Enter the email on your account and we'll send you a 6-digit code."
        image={braceletImg}
        footer={
          <>
            Remembered it? <TextLink to="/login">Sign in</TextLink>
          </>
        }
      >
        <form onSubmit={requestCode} noValidate className="space-y-5">
          <FormMessage>{generalError}</FormMessage>
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
          <Button type="submit" loading={loading} className="w-full">
            Send code
          </Button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      intro={
        <>
          If <strong className="font-medium text-brand-forest-950">{email}</strong> has an account, a code is on its way.
          Resetting signs you out on every device.
        </>
      }
      image={braceletImg}
      footer={
        <>
          Wrong email?{' '}
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
              setCode('')
            }}
            className="font-medium text-brand-forest-800 underline decoration-brand-gold-500/70 underline-offset-4 hover:text-brand-forest-950 focus-visible:outline-2 focus-visible:outline-brand-gold-500"
          >
            Use a different one
          </button>
        </>
      }
    >
      <form onSubmit={reset} noValidate className="space-y-6">
        <FormMessage>{generalError}</FormMessage>
        <FormMessage tone="info">{notice}</FormMessage>
        <div>
          <p id={labelId} className="mb-2 text-sm font-medium text-brand-forest-900">
            Code from your email
          </p>
          <OtpInput value={code} onChange={setCode} invalid={Boolean(fields.code)} labelId={labelId} />
          {fields.code && <p className="mt-1.5 text-[13px] text-red-800">{fields.code}</p>}
        </div>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={fields.newPassword}
          hint="At least 8 characters, with a letter and a number."
          required
        />
        <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
          Update password
        </Button>
        <p className="text-sm text-brand-forest-900/75">
          {resendIn > 0 ? (
            `You can request a new code in ${resendIn}s.`
          ) : (
            <button
              type="button"
              onClick={() => requestCode()}
              className="font-medium text-brand-forest-800 underline decoration-brand-gold-500/70 underline-offset-4 hover:text-brand-forest-950 focus-visible:outline-2 focus-visible:outline-brand-gold-500"
            >
              Send a new code
            </button>
          )}
        </p>
      </form>
    </AuthLayout>
  )
}
