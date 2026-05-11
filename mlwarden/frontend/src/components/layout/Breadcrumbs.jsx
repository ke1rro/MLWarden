import { ChevronRight } from 'lucide-react'

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span className="breadcrumb-item" key={`${item}-${index}`}>
          {index > 0 ? <ChevronRight size={13} /> : null}
          {item}
        </span>
      ))}
    </nav>
  )
}
