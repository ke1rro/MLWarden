import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button.jsx'

export function ArtifactTable({
  artifacts,
  compactActions = false,
  onDownload,
  onViewMetadata,
  showProjectColumns = false,
  showTechnicalColumns = true,
}) {
  const actionSize = compactActions ? 'sm' : undefined

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            {showProjectColumns ? <th>Project</th> : null}
            {showProjectColumns ? <th>Run</th> : null}
            <th>Path</th>
            <th>Size</th>
            {showTechnicalColumns ? <th>Content type</th> : null}
            {showTechnicalColumns ? <th>Created</th> : null}
            <th>Metadata</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((artifact) => (
            <tr
              data-search-text={`${artifact.name} ${artifact.path} ${artifact.projectName || ''} ${artifact.runName || ''} ${artifact.contentType}`}
              key={artifact.id}
            >
              <td>{artifact.name}</td>
              {showProjectColumns ? (
                <td>
                  <Link className="table-link" to={`/projects/${artifact.projectId}`}>
                    {artifact.projectName}
                  </Link>
                </td>
              ) : null}
              {showProjectColumns ? (
                <td>
                  <Link className="table-link" to={`/runs/${artifact.runId}?tab=artifacts`}>
                    {artifact.runName}
                  </Link>
                </td>
              ) : null}
              <td className="mono-cell">{artifact.path}</td>
              <td>{artifact.size}</td>
              {showTechnicalColumns ? <td>{artifact.contentType}</td> : null}
              {showTechnicalColumns ? <td>{artifact.created}</td> : null}
              <td>
                <Button
                  size={actionSize}
                  variant="secondary"
                  onClick={() => onViewMetadata?.(artifact)}
                >
                  View metadata
                </Button>
              </td>
              <td>
                <Button onClick={() => onDownload?.(artifact)} size={actionSize} variant="secondary">
                  <Download size={15} />
                  Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
