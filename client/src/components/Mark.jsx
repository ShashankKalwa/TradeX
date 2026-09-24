// The TradeX mark — one authored artwork, shared by the desk rail and the
// sign-in page. Previously duplicated inline with hardcoded hex in two files.

export default function Mark({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={`shrink-0 ${className}`}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="#ece4d4" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="none" stroke="#a99a78" strokeWidth="1" />
      <path
        d="M8 21l5-6 3.5 3.5L23 11"
        fill="none"
        stroke="#a33327"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="11" r="2.2" fill="#a33327" stroke="#ece4d4" strokeWidth="1.5" />
    </svg>
  )
}
