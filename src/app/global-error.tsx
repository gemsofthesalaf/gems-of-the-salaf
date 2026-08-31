'use client'

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f7f3ea', color: '#171511', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div role="alert" style={{ maxWidth: '36rem', border: '1px solid #d7cfc0', background: '#fffdf8', padding: '2rem' }}>
            <p style={{ color: '#b94e13', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>Gems of the Salaf</p>
            <h1>Something went wrong.</h1>
            <p>The site encountered an unexpected error. No technical or private details are shown.</p>
            <button type="button" onClick={retry} style={{ minHeight: 44, marginTop: '1rem', padding: '.75rem 1rem', color: 'white', background: '#171511', border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  )
}
