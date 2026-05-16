import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const crumb = typeof item === 'string' ? { label: item } : item
        return (
          <span className="breadcrumb-item" key={`${crumb.label}-${index}`}>
            {index > 0 ? <ChevronRight size={13} /> : null}
            {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
          </span>
        )
      })}
    </nav>
  )
}
