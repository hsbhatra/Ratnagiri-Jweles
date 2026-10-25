/**
 * Sends one sample verification email so you can check delivery and how it looks.
 * Usage: npm run email:test -- you@example.com
 */
process.env.EMAIL_STRICT = '1' // report Brevo errors instead of falling back to printing
const { sendOtpEmail, verifyEmailTransport } = await import('../src/services/email.service.js')

const to = process.argv[2]
if (!to) {
  console.error('Usage: npm run email:test -- you@example.com')
  process.exit(1)
}

try {
  const status = await verifyEmailTransport()
  console.log(`Provider: ${status.provider}  From: ${status.from}`)
  await sendOtpEmail({ to, name: 'Test', code: '123456', purpose: 'registration', ttlMin: 10 })
  console.log(status.provider === 'console' ? 'Printed above (no provider configured).' : `Sent to ${to} — check the inbox and spam folder.`)
} catch (err) {
  console.error(`Failed: ${err.message}`)
  if (/unrecognised IP|not authori[sz]ed/i.test(err.message)) {
    console.error('Brevo blocked this IP: Brevo > your name > Security > Authorized IPs > deactivate blocking.')
  }
  if (/sender/i.test(err.message)) {
    console.error('EMAIL_FROM must be a sender verified in Brevo (Senders, domains & dedicated IPs > Senders).')
  }
  process.exit(1)
}
