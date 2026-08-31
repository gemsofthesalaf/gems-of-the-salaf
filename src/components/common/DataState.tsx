import Link from 'next/link'
import { AlertTriangle, Database, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DataUnavailable({ message, headingLevel = 2 }: { message?: string; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <section className="state-panel" role="alert" aria-labelledby="data-unavailable-title">
      <Database aria-hidden="true" />
      <div>
        <Heading id="data-unavailable-title">Archive data is unavailable</Heading>
        <p>{message ?? 'We could not reach the archive database. Please try again in a moment.'}</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Return home</Link>
      </Button>
    </section>
  )
}

export function EmptyState({
  title,
  description,
  clearHref,
}: {
  title: string
  description: string
  clearHref?: string
}) {
  return (
    <section className="state-panel" aria-labelledby="empty-state-title">
      <SearchX aria-hidden="true" />
      <div>
        <h2 id="empty-state-title">{title}</h2>
        <p>{description}</p>
      </div>
      {clearHref ? (
        <Button asChild variant="outline">
          <Link href={clearHref}>Clear filters</Link>
        </Button>
      ) : null}
    </section>
  )
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
