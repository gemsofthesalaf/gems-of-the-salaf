import type { Metadata } from 'next'
import { DirectoryListing } from '@/components/directory/DirectoryListing'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Source directory',
  description: 'Browse source works and references connected to published quotations.',
  alternates: { canonical: '/sources' },
  openGraph: { title: 'Source directory', description: 'Browse source works connected to published quotations.', url: '/sources' },
}

export default async function SourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DirectoryListing kind="sources" title="Source directory" description="Browse books and other recorded source works. Edition and publisher information is shown only where it exists in the archive." rawSearchParams={await searchParams} />
}
