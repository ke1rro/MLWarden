import clsx from 'clsx'

export function IconButton({ label, icon, className, ...props }) {
  const Icon = icon

  return (
    <button className={clsx('icon-button', className)} type="button" aria-label={label} title={label} {...props}>
      <Icon size={16} />
    </button>
  )
}
