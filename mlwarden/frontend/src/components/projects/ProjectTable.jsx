import { Edit, ExternalLink, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'

export function ProjectTable({ projects, onEditProject, onDeleteProject }) {
  const navigate = useNavigate()

  if (!projects.length) {
    return <EmptyState title="No projects yet." message="Create your first project or connect a worker script." />
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Runs</th>
            <th>Running</th>
            <th>Failed</th>
            <th>Latest run</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr data-search-text={`${project.name} ${project.description} ${project.tags.join(' ')}`} key={project.id}>
              <td>
                <Link className="table-link" to={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              </td>
              <td className="muted-cell">{project.description || 'n/a'}</td>
              <td>{project.stats.runs}</td>
              <td>{project.stats.running}</td>
              <td>{project.stats.failed}</td>
              <td>{project.latestRun}</td>
              <td>
                <div className="tag-row">
                  {project.tags.map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </td>
              <td>
                <ActionMenu items={[
                  { label: 'View project', icon: ExternalLink, onSelect: () => navigate(`/projects/${project.id}`) },
                  ...(onEditProject ? [{ label: 'Edit project', icon: Edit, onSelect: () => onEditProject(project) }] : []),
                  ...(onDeleteProject ? [{ label: 'Delete project', icon: Trash2, onSelect: () => onDeleteProject(project) }] : []),
                ]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
