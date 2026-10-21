export function BrandMark({ className = '' }) {
  return (
    <span className={`brand-symbol ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#2B50F5" />
        <path d="m21.5 8.5-4 9-7 6 3.5-9.5 7.5-5.5Z" fill="#FFB020" stroke="white" strokeLinejoin="round" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="1.4" fill="white" />
      </svg>
    </span>
  )
}
