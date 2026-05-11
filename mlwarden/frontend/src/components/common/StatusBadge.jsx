import clsx from 'clsx'

export function StatusBadge({ status }) {
  return (
    <span className={clsx('status-badge', `status-${status}`)}>
      <span className="status-dot" />
      {status}
    </span>
  )
}
