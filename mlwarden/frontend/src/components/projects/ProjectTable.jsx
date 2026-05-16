import { Link } from 'react-router-dom'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'

export function ProjectTable({ projects }) {
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
              <td>{project.latestRun}</td>
              <td>
                <div className="tag-row">
                  {project.tags.map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </td>
              <td><ActionMenu /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
