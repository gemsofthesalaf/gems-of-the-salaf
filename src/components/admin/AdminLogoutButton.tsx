'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false)
  return <button type="button" className="button button-secondary button-small" disabled={busy} onClick={async () => { setBusy(true); await signOut({ callbackUrl: '/admin/login' }) }}><LogOut aria-hidden="true" />{busy ? 'Signing out…' : 'Sign out'}</button>
}
