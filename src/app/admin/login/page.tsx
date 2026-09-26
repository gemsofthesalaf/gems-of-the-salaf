'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const router = useRouter()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await signIn('credentials', { redirect: false, email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') })
      if (!result?.ok || result.error) {
        setError('The email or password is incorrect, or this account is not authorized.')
        return
      }
      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Sign-in could not be completed. Check your connection and try again.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section className="login-panel" aria-labelledby="login-title"><div className="login-card">
      <ShieldCheck className="login-icon" aria-hidden="true" /><p className="eyebrow">Restricted access</p><h1 id="login-title">Administration</h1><p className="muted-copy">Sign in with an active administrator account.</p>
      <form onSubmit={submit} className="form-stack" aria-busy={busy}>
        {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
        <label className="field-label" htmlFor="email">Email</label><input id="email" name="email" className="field-control" type="email" autoComplete="username" required maxLength={254} disabled={busy} />
        <label className="field-label" htmlFor="password">Password</label><input id="password" name="password" className="field-control" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} />
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Authenticating…' : 'Sign in'}</button>
      </form>
    </div></section>
  )
}
