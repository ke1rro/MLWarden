import { BarChart3, Boxes, FileArchive, FolderKanban, Gauge, LineChart, Settings, TableProperties } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/projects/learnable-wavelets', label: 'Workspace', icon: Gauge },
  { to: '/runs/run-dulcet-snowflake-18', label: 'Runs', icon: TableProperties },
  { to: '/projects/learnable-wavelets/charts', label: 'Charts', icon: LineChart },
  { to: '/projects/learnable-wavelets/charts', label: 'Reports', icon: BarChart3 },
  { to: '/runs/run-dulcet-snowflake-18?tab=artifacts', label: 'Artifacts', icon: FileArchive },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function SidebarNav() {
  return (
    <aside className="sidebar">
      <div className="sidebar-stack">
        {navItems.map((item) => {
          const Icon = item.icon || Boxes
          return (
            <NavLink className="sidebar-link" key={item.label} to={item.to} title={item.label}>
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}
