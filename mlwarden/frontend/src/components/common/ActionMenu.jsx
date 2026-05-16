import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from './IconButton.jsx'

export function ActionMenu({ label = 'More actions', items = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div className="action-menu" ref={ref}>
      <IconButton label={label} icon={MoreHorizontal} onClick={() => setOpen((current) => !current)} />
      {open ? (
        <div className="action-menu-popover">
          {items.length ? items.map((item) => {
            const Icon = item.icon
            return (
              <button
                disabled={item.disabled}
                key={item.label}
                onClick={() => {
                  setOpen(false)
                  item.onSelect?.()
                }}
                type="button"
              >
                {Icon ? <Icon size={15} /> : null}
                {item.label}
              </button>
            )
          }) : <span>No actions available</span>}
        </div>
      ) : null}
    </div>
  )
}
