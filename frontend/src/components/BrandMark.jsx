export function BrandMark({ className = '' }) {
  return (
    <span className={`brand-symbol ${className}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <rect x="1" y="1" width="38" height="38" rx="13" fill="#4D5DFF" />
        <path d="M20 6.5 23.8 16l9.7 4-9.7 3.9L20 34l-3.8-10.1L6.5 20l9.7-4L20 6.5Z" fill="#E7EBFF" />
        <path d="m24.4 15.5-3.1 7.1-6.1 2.2 2.8-6.8 6.4-2.5Z" fill="#FFCA72" />
        <circle cx="20" cy="20" r="2" fill="#fff" />
      </svg>
    </span>
  )
}
