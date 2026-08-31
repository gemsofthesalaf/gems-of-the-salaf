import type { Metadata } from 'next'
import { DirectoryListing } from '@/components/directory/DirectoryListing'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Translator directory',
  description: 'Browse translators connected to English renderings in the published quote archive.',
  alternates: { canonical: '/translators' },
  openGraph: { title: 'Translator directory', description: 'Browse translators connected to published English renderings.', url: '/translators' },
}

export default async function TranslatorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DirectoryListing kind="translators" title="Translator directory" description="Find published English renderings by translator. Additional information appears only when supplied by the archive." rawSearchParams={await searchParams} />
}
