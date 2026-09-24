// Authored icon set — one stroke weight (1.6), 20px grid, no fills.

const PATHS = {
  blotter: (
    <>
      <path d="M3 4.5h14M3 8h14M3 11.5h9M3 15h6" />
      <path d="M16.5 12.5v4.5l2.5-1.2 2.5 1.2v-4.5" transform="translate(-6.5 -3)" />
    </>
  ),
  markets: (
    <>
      <path d="M4 19V10M9 19V5M14 19v-7M19 19v-11" />
    </>
  ),
  stock: (
    <>
      <path d="M3 17l4.5-5 3.5 3 4-6 4.5 5" />
      <path d="M3 20.5h17" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 6.5A1.5 1.5 0 016.5 5H18v10.5H6.5A1.5 1.5 0 005 17" />
      <path d="M4 6.5V17a1.5 1.5 0 003 0V6.5" />
      <path d="M18 15.5v3.5H6.5" />
      <path d="M9 8.5h6M9 11.5h4" />
    </>
  ),
  ledger: (
    <>
      <path d="M5 4.5h11.5a1.5 1.5 0 011.5 1.5V18a1.5 1.5 0 01-1.5 1.5H5z" />
      <path d="M5 4.5a1.5 1.5 0 00-1.5 1.5v13A1.5 1.5 0 005 20.5" />
      <path d="M8 9h7M8 12.5h7M8 16h4" />
    </>
  ),
  star: <path d="M12 4l2.3 5 5.4.6-4 3.7 1.1 5.3-4.8-2.8-4.8 2.8 1.1-5.3-4-3.7 5.4-.6z" />,
  trophy: (
    <>
      <path d="M8 4.5h8v4a4 4 0 01-8 0z" />
      <path d="M8 6H5.5a0 0 0 000 0c0 2.5 1 4 2.5 4.5M16 6h2.5c0 2.5-1 4-2.5 4.5" />
      <path d="M12 12.5v3M9 19h6M10 19l.5-3.5h3l.5 3.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M14.8 14.8L19 19" />
    </>
  ),
  logout: (
    <>
      <path d="M13 5H6.5A1.5 1.5 0 005 6.5v11A1.5 1.5 0 006.5 19H13" />
      <path d="M10.5 12H19M16 8.5L19.5 12 16 15.5" />
    </>
  ),
  arrowLeft: <path d="M14.5 6.5L9 12l5.5 5.5" />,
  mail: (
    <>
      <path d="M4 7l8 5 8-5" />
      <path d="M4 6.5A1.5 1.5 0 015.5 5h13A1.5 1.5 0 0120 6.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5v-11z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.5l-8.5 14h17L12 4.5z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.88 9.88a3 3 0 104.24 4.24M10.73 5.08A10.43 10.43 0 0112 5c7 0 10 7 10 7a13.16 13.16 0 01-1.67 2.68M6.61 6.61A13.526 13.526 0 002 12s3 7 10 7a9.74 9.74 0 005.39-1.61M2 2l20 20" />
    </>
  )
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.6 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
