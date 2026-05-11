import { MoreHorizontal } from 'lucide-react'
import { IconButton } from './IconButton.jsx'

export function ActionMenu({ label = 'More actions' }) {
  return <IconButton label={label} icon={MoreHorizontal} />
}
