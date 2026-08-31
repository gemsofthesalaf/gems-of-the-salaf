import type { Metadata } from 'next'
import { DirectoryListing } from '@/components/directory/DirectoryListing'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Category directory',
  description: 'Browse expandable topics and categories across the published quote archive.',
  alternates: { canonical: '/categories' },
  openGraph: { title: 'Category directory', description: 'Browse topics across the published quote archive.', url: '/categories' },
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DirectoryListing kind="categories" title="Category directory" description="Explore the archive by topic. Categories are maintained as linked records so the system can expand without duplicating text on quotations." rawSearchParams={await searchParams} />
}
