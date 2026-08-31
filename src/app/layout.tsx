import type { Metadata, Viewport } from 'next'
import { Amiri, Inter, Playfair_Display } from 'next/font/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/common/JsonLd'
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_ARABIC } from '@/lib/site'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], display: 'swap' })
const amiri = Amiri({ variable: '--font-amiri', weight: ['400', '700'], subsets: ['arabic', 'latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  title: { default: `${SITE_NAME} | ${SITE_NAME_ARABIC}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} | ${SITE_NAME_ARABIC}`,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Gems of the Salaf — a searchable scholarly quote archive' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#171511' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_NAME_ARABIC,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/quotes')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${amiri.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <JsonLd value={websiteSchema} />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
