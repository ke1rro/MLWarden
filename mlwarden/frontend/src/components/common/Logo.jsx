import clsx from 'clsx'
import logoMark from '@/assets/mlw_logo.svg'

export function Logo({ compact = false, className }) {
  return (
    <div className={clsx('logo-lockup', compact && 'is-compact', className)} aria-label="MLWarden">
      <img className="logo-mark" src={logoMark} alt="" aria-hidden="true" />
      {!compact ? (
        <span className="logo-text">
          <strong>MLWarden</strong>
        </span>
      ) : null}
    </div>
  )
}
