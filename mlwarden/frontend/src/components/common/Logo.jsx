import clsx from 'clsx'

export function Logo({ compact = false, className }) {
  return (
    <div className={clsx('logo-lockup', compact && 'is-compact', className)} aria-label="MLWarden">
      <svg className="logo-mark" viewBox="0 0 40 40" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="logo-gradient" x1="6" x2="34" y1="6" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="0.55" stopColor="#2563eb" />
            <stop offset="1" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="#0f172a" />
        <path
          d="M9 27.5V12.25L15.25 20L20 12.25L24.75 20L31 12.25V27.5"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
        <path
          d="M11 29.5C15.25 25.7 18.95 25.7 23.2 29.5C25.35 31.4 27.45 31.4 30 29.5"
          fill="none"
          stroke="#dbeafe"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      {!compact ? (
        <span className="logo-text">
          <strong>MLWarden</strong>
          <small>experiment tracking</small>
        </span>
      ) : null}
    </div>
  )
}
