import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { env } from '../config/env.js'

/**
 * One send() for the whole app, three interchangeable transports:
 *  - resend : production, once the store's own domain is verified in Resend
 *  - smtp   : any SMTP inbox (e.g. a Gmail address + app password) — works today, before
 *             a domain exists, and can email anyone (Gmail caps ~500/day)
 *  - console: local dev fallback, prints the email to the backend terminal
 * EMAIL_PROVIDER picks one explicitly; otherwise the first configured one wins.
 */

/** Test hook: tests read the last code sent to an address instead of a real inbox. */
export const sentEmails = []

function pickProvider() {
  const wanted = (process.env.EMAIL_PROVIDER || '').toLowerCase()
  if (wanted) return wanted
  if (env.resendApiKey) return 'resend'
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return 'smtp'
  return 'console'
}

const provider = env.isTest ? 'test' : pickProvider()

let resend = null
let smtp = null
if (provider === 'resend') {
  if (!env.resendApiKey) throw new Error('[email] EMAIL_PROVIDER=resend but RESEND_API_KEY is empty')
  resend = new Resend(env.resendApiKey)
}
if (provider === 'smtp') {
  const port = Number(process.env.SMTP_PORT || 465)
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}
if (provider === 'console' && env.isProd) {
  throw new Error('[email] No email provider configured — set RESEND_API_KEY or SMTP_* in production')
}

/** Who the email appears to come from. Gmail rewrites any other address to the account's own. */
function fromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  if (provider === 'smtp') return `RatnaGiri Jewels <${process.env.SMTP_USER}>`
  return env.emailFrom
}

export function emailStatus() {
  return { provider, from: provider === 'test' ? null : fromAddress() }
}

export async function verifyEmailTransport() {
  if (smtp) await smtp.verify()
  return emailStatus()
}

export async function sendEmail({ to, subject, html, text }) {
  if (provider === 'test') {
    sentEmails.push({ to, subject, text })
    return
  }
  if (provider === 'console') {
    console.info(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text}\n`)
    return
  }
  const replyTo = process.env.EMAIL_REPLY_TO || undefined
  if (provider === 'resend') {
    const { error } = await resend.emails.send({ from: fromAddress(), to, subject, html, text, replyTo })
    if (error) throw new Error(`[email] Resend failed: ${error.message}`)
    return
  }
  if (provider === 'smtp') {
    await smtp.sendMail({ from: fromAddress(), to, subject, html, text, replyTo })
    return
  }
  throw new Error(`[email] Unknown EMAIL_PROVIDER "${provider}" (use resend, smtp or console)`)
}

// ---------------------------------------------------------------- templates

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * Shared brand shell for every transactional email (table layout + inline styles, which is
 * what Gmail/Outlook reliably render). `bodyHtml` must already be escaped.
 */
export function renderEmailLayout({ preheader = '', bodyHtml }) {
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>RatnaGiri Jewels</title></head>
<body style="margin:0;padding:0;background:#ece4d3">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece4d3;padding:32px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#f6f1e7;border-radius:14px;overflow:hidden">
    <tr><td style="background:#0a2b22;padding:22px 32px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#e8cd7f;letter-spacing:.5px">RatnaGiri Jewels</td></tr>
    <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0a2b22">${bodyHtml}</td></tr>
    <tr><td style="padding:18px 32px 26px;border-top:1px solid #e2d8c3;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#4b6358">
      Handcrafted jewellery. This is an automated message about your account; replies to this address may not be read.<br>© ${year} RatnaGiri Jewels
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

const OTP_COPY = {
  registration: {
    subject: 'Your RatnaGiri Jewels verification code',
    lead: 'Welcome to RatnaGiri Jewels. Use this code to verify your email address:',
  },
  password_reset: {
    subject: 'Your RatnaGiri Jewels password reset code',
    lead: 'We received a request to reset your password. Use this code to continue:',
  },
}

export async function sendOtpEmail({ to, name, code, purpose, ttlMin }) {
  const copy = OTP_COPY[purpose]
  const footer = `This code expires in ${ttlMin} minutes. If you didn't ask for it, you can ignore this email — your account is safe.`
  const text = `${name ? `Hi ${name},` : 'Hi,'}\n\n${copy.lead}\n\n${code}\n\n${footer}\n\n— RatnaGiri Jewels`
  const bodyHtml = `
    <p style="margin:0 0 14px">${name ? `Hi ${escapeHtml(name)},` : 'Hi,'}</p>
    <p style="margin:0 0 22px">${copy.lead}</p>
    <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:36px;letter-spacing:10px;color:#a9801f">${code}</p>
    <p style="margin:0;font-size:13px;color:#4b6358">${footer}</p>`
  await sendEmail({
    to,
    subject: copy.subject,
    text,
    html: renderEmailLayout({ preheader: `Your code is ${code}`, bodyHtml }),
  })
}
