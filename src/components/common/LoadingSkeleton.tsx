export function PageLoadingSkeleton() {
  return (
    <section className="page-shell" aria-busy="true" aria-labelledby="loading-heading">
      <h1 id="loading-heading" className="sr-only">Loading page</h1>
      <div className="skeleton skeleton-kicker" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton skeleton-card" />)}
      </div>
    </section>
  )
}
