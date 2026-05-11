import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'

export function ArtifactList({ artifacts }) {
  const [query, setQuery] = useState('')
  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => `${artifact.name} ${artifact.path} ${artifact.contentType}`.toLowerCase().includes(query.toLowerCase())),
    [artifacts, query],
  )

  if (!artifacts.length) {
    return <EmptyState title="No artifacts uploaded." message="Checkpoints, reports, CSV files, and ZIP bundles will appear here." />
  }

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search artifacts" />
        <Button variant="secondary">Collapse tree</Button>
      </Toolbar>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Path</th>
              <th>Size</th>
              <th>Content type</th>
              <th>Created</th>
              <th>Metadata</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredArtifacts.map((artifact) => (
              <tr key={artifact.id}>
                <td>{artifact.name}</td>
                <td className="mono-cell">{artifact.path}</td>
                <td>{artifact.size}</td>
                <td>{artifact.contentType}</td>
                <td>{artifact.created}</td>
                <td><JsonPreview value={artifact.metadata} /></td>
                <td><IconButton label={`Download ${artifact.name}`} icon={Download} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
