import { env } from '../config/env.js'

/**
 * One send() for the whole app:
 *  - brevo  : the provider on every environment (dev, testing, production). Uses Brevo's
 *             HTTPS API, not SMTP, so it works on hosts that block SMTP ports (Render free).
 *             EMAIL_FROM must be a sender verified in Brevo (Senders, domains & dedicated IPs).
 *  - console: prints the email to the backend terminal when BREVO_API_KEY is empty (dev only).
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

/** Test hook: tests read the last code sent to an address instead of a real inbox. */
export const sentEmails = []

const provider = env.isTest ? 'test' : env.brevoApiKey ? 'brevo' : 'console'

if (provider === 'console' && env.isProd) {
  throw new Error('[email] BREVO_API_KEY is required in production')
}

/** "RatnaGiri Jewels <hello@x.com>" -> { name, email } */
function parseAddress(value) {
  const m = String(value || '').match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/)
  if (m) return { name: m[1]?.trim() || undefined, email: m[2].trim() }
  return { email: String(value || '').trim() }
}

const sender = parseAddress(env.emailFrom)
if (provider === 'brevo' && !sender.email) {
  throw new Error('[email] EMAIL_FROM must be set to a sender verified in Brevo')
}

export function emailStatus() {
  return { provider, from: provider === 'test' ? null : env.emailFrom || null }
}

/** Checks the API key and that the account answers (used at boot and by email:test). */
export async function verifyEmailTransport() {
  if (provider === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': env.brevoApiKey, accept: 'application/json' } })
    if (!res.ok) throw new Error(`Brevo rejected the API key (${res.status}): ${await brevoMessage(res)}`)
  }
  return emailStatus()
}

async function brevoMessage(res) {
  try {
    const body = await res.json()
    return body.message || body.code || res.statusText
  } catch {
    return res.statusText
  }
}

function printEmail({ to, subject, text }) {
  console.info(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text}\n`)
}

export async function sendEmail({ to, subject, html, text }) {
  if (provider === 'test') {
    sentEmails.push({ to, subject, text })
    return
  }
  if (provider === 'console') {
    printEmail({ to, subject, text })
    return
  }

  const replyTo = process.env.EMAIL_REPLY_TO ? { email: process.env.EMAIL_REPLY_TO } : undefined
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': env.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html, textContent: text, replyTo }),
  })
  if (res.ok) return

  const message = await brevoMessage(res)
  // Locally, still let you finish a sign-up when Brevo refuses (bad key, unverified sender)
  if (!env.isProd) {
    console.warn(`[email] Brevo refused (${res.status} ${message}) — printing instead (dev only)`)
    printEmail({ to, subject, text })
    return
  }
  throw new Error(`[email] Brevo failed (${res.status}): ${message}`)
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
