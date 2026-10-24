import { useEffect, useState } from 'react'

/** Seconds remaining until a resend is allowed; call restart(n) after each send. */
export default function useCountdown(initial = 0) {
  const [seconds, setSeconds] = useState(initial)
  useEffect(() => {
    if (seconds <= 0) return undefined
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])
  return [seconds, setSeconds]
}
