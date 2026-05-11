import clsx from 'clsx'

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button className={clsx('button', `button-${variant}`, `button-${size}`, className)} type="button" {...props}>
      {children}
    </button>
  )
}
