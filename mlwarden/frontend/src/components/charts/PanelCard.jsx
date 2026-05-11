import { X } from 'lucide-react'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'

export function PanelCard({ title, children, onRemove }) {
  return (
    <article className="chart-panel">
      <header className="chart-panel-header">
        <h3>{title}</h3>
        <div>
          {onRemove ? <IconButton label={`Remove ${title}`} icon={X} onClick={onRemove} /> : null}
          <ActionMenu />
        </div>
      </header>
      {children}
    </article>
  )
}
