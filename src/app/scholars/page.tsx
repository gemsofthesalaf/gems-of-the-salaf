import type { Metadata } from 'next'
import { DirectoryListing } from '@/components/directory/DirectoryListing'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Scholar directory',
  description: 'Browse scholars represented in the published Gems of the Salaf quote archive.',
  alternates: { canonical: '/scholars' },
  openGraph: { title: 'Scholar directory', description: 'Browse scholars represented in the published quote archive.', url: '/scholars' },
}

export default async function ScholarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DirectoryListing kind="scholars" title="Scholar directory" description="Browse the people to whom published quotations in the archive are attributed. Biographical information appears only when it has been supplied by the editors." rawSearchParams={await searchParams} />
}
