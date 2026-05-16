import { Maximize2, Minimize2, X } from 'lucide-react'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'

export function PanelCard({
  title,
  children,
  onRemove,
  actions = [],
  size = 'md',
  onResize,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  return (
    <article
      className={`chart-panel chart-panel-${size}`}
      data-search-text={title}
      draggable={draggable}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <header className="chart-panel-header">
        <h3>{title}</h3>
        <div>
          {onResize ? (
            <>
              <IconButton label={`Make ${title} smaller`} icon={Minimize2} onClick={() => onResize('sm')} />
              <IconButton label={`Make ${title} larger`} icon={Maximize2} onClick={() => onResize('lg')} />
            </>
          ) : null}
          {onRemove ? <IconButton label={`Remove ${title}`} icon={X} onClick={onRemove} /> : null}
          <ActionMenu items={actions} />
        </div>
      </header>
      {children}
    </article>
  )
}
