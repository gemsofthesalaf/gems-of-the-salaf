'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="page-shell error-page" role="alert">
      <AlertTriangle aria-hidden="true" />
      <span>Unexpected error</span>
      <h1>We could not load this page.</h1>
      <p>No private error details have been displayed. You can retry the request safely.</p>
      <Button type="button" onClick={retry}><RotateCcw aria-hidden="true" /> Try again</Button>
    </div>
  )
}
