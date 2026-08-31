import { safeJsonLd } from '@/lib/site'

export function JsonLd({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(value) }} />
}
