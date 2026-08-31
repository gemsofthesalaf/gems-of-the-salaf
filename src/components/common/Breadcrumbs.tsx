import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { JsonLd } from '@/components/common/JsonLd'
import { absoluteUrl } from '@/lib/site'

export type BreadcrumbItem = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  }

  return (
    <>
      <JsonLd value={schema} />
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol>
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
              {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
