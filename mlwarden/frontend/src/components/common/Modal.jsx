import { X } from 'lucide-react'
import { IconButton } from '@/components/common/IconButton.jsx'

export function Modal({ title, description, children, footer, onClose, size = 'md' }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className={`modal-panel modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  )
}
