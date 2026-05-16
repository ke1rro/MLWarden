import { useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { MetadataModal } from '@/components/common/MetadataModal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'

function ArtifactUploadForm({ onUpload }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [artifactPath, setArtifactPath] = useState('')
  const [metadata, setMetadata] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError('')
    if (!file) {
      setError('Choose an artifact file.')
      return
    }

    let parsedMetadata
    try {
      parsedMetadata = metadata.trim() ? JSON.parse(metadata) : undefined
    } catch {
      setError('Metadata is not valid JSON.')
      return
    }

    try {
      setIsUploading(true)
      await onUpload({
        file,
        name,
        artifactPath,
        metadata: parsedMetadata,
      })
      setFile(null)
      setName('')
      setArtifactPath('')
      setMetadata('')
      formElement.reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err.message || 'Artifact upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit}>
      <label>
        File
        <input ref={fileInputRef} onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
      </label>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Artifact path
        <input placeholder="checkpoints/model.pt" value={artifactPath} onChange={(event) => setArtifactPath(event.target.value)} />
      </label>
      <label>
        Metadata JSON
        <input placeholder='{"epoch": 3}' value={metadata} onChange={(event) => setMetadata(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <Button disabled={isUploading} type="submit">{isUploading ? 'Uploading...' : 'Upload artifact'}</Button>
    </form>
  )
}

export function ArtifactList({ artifacts, onUpload, onDownload }) {
  const [query, setQuery] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedMetadata, setSelectedMetadata] = useState(null)
  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => `${artifact.name} ${artifact.path} ${artifact.contentType}`.toLowerCase().includes(query.toLowerCase())),
    [artifacts, query],
  )

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search artifacts" />
        {onUpload ? <Button onClick={() => setIsUploadOpen((current) => !current)} variant="secondary">Upload artifact</Button> : null}
      </Toolbar>
      {isUploadOpen ? <ArtifactUploadForm onUpload={onUpload} /> : null}
      {!artifacts.length ? <EmptyState title="No artifacts uploaded." message="Checkpoints, reports, CSV files, and ZIP bundles will appear here." /> : null}
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
              <tr data-search-text={`${artifact.name} ${artifact.path} ${artifact.contentType}`} key={artifact.id}>
                <td>{artifact.name}</td>
                <td className="mono-cell">{artifact.path}</td>
                <td>{artifact.size}</td>
                <td>{artifact.contentType}</td>
                <td>{artifact.created}</td>
                <td>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedMetadata({ title: `${artifact.name} metadata`, value: artifact.metadata })}>
                    View metadata
                  </Button>
                </td>
                <td>
                  <Button onClick={() => onDownload?.(artifact)} variant="secondary">
                    <Download size={15} />
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedMetadata ? (
        <MetadataModal title={selectedMetadata.title} value={selectedMetadata.value} onClose={() => setSelectedMetadata(null)} />
      ) : null}
    </section>
  )
}
