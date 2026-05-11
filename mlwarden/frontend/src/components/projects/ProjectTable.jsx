import { Link } from 'react-router-dom'
import { getProjectStats } from '../../mockData.js'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { EmptyState } from '../common/EmptyState.jsx'

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
          {projects.map((project) => {
            const stats = getProjectStats(project.id)
            return (
              <tr key={project.id}>
                <td>
                  <Link className="table-link" to={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                </td>
                <td className="muted-cell">{project.description}</td>
                <td>{stats.runs}</td>
                <td>{stats.running}</td>
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
