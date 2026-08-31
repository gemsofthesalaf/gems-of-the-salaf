export function PageLoadingSkeleton() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Loading content">
      <div className="skeleton skeleton-kicker" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton skeleton-card" />)}
      </div>
    </div>
  )
}
