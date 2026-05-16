import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'

export function PanelCard({
  title,
  children,
  className = '',
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
      className={`chart-panel chart-panel-${size} ${className}`.trim()}
      data-search-text={title}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="chart-panel-header">
        <h3>{title}</h3>
        <div>
          {draggable ? <IconButton className="drag-handle" draggable icon={GripVertical} label={`Move ${title}`} onDragStart={onDragStart} /> : null}
          {onResize ? (
            <IconButton
              label={size === 'lg' ? `Make ${title} smaller` : `Make ${title} larger`}
              icon={size === 'lg' ? Minimize2 : Maximize2}
              onClick={() => onResize(size === 'lg' ? 'md' : 'lg')}
            />
          ) : null}
          {onRemove ? <IconButton className="icon-button-compact" label={`Remove ${title}`} icon={X} onClick={onRemove} /> : null}
          <ActionMenu items={actions} />
        </div>
      </header>
      {children}
    </article>
  )
}
