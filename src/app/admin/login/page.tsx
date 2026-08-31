'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const result = await signIn('credentials', { redirect: false, email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') })
    if (!result?.ok) { setError('The email or password is incorrect, or this account is not authorized.'); setBusy(false); return }
    router.replace('/admin'); router.refresh()
  }

  return (
    <section className="login-panel" aria-labelledby="login-title"><div className="login-card">
      <ShieldCheck className="login-icon" aria-hidden="true" /><p className="eyebrow">Restricted access</p><h1 id="login-title">Administration</h1><p className="muted-copy">Sign in with an active administrator account.</p>
      <form onSubmit={submit} className="form-stack">
        {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
        <label className="field-label" htmlFor="email">Email</label><input id="email" name="email" className="field-control" type="email" autoComplete="username" required maxLength={254} />
        <label className="field-label" htmlFor="password">Password</label><input id="password" name="password" className="field-control" type="password" autoComplete="current-password" required maxLength={256} />
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Authenticating…' : 'Sign in'}</button>
      </form>
    </div></section>
  )
}
