export function PageSkeleton({ title = 'Đang tải nội dung' }) {
  return (
    <main className="page-content" aria-label={title} aria-busy="true">
      <p className="visually-hidden" role="status">{title}</p>
      <div className="skeleton-stack panel">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </main>
  )
}
