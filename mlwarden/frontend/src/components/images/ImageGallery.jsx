import { useMemo, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'

export function ImageGallery({ images }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)

  const groups = ['all', ...new Set(images.map((image) => image.group))]
  const filteredImages = useMemo(
    () =>
      images.filter((image) => {
        const matchesGroup = group === 'all' || image.group === group
        const matchesQuery = `${image.name} ${image.caption} ${image.step} ${image.split}`.toLowerCase().includes(query.toLowerCase())
        return matchesGroup && matchesQuery
      }),
    [group, images, query],
  )

  if (!images.length) {
    return <EmptyState title="No images uploaded." message="Input previews, reconstructions, and masks will appear here." />
  }

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by image name, step, or split" />
        <select value={group} onChange={(event) => setGroup(event.target.value)}>
          {groups.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Toolbar>
      <div className="image-grid">
        {filteredImages.map((image, index) => (
          <button className="image-card" key={image.id} onClick={() => setSelectedImage(image)} type="button">
            <span className={`image-placeholder image-${index % 4}`} />
            <strong>{image.name}</strong>
            <small>step {image.step} · {image.size}</small>
            <p>{image.caption}</p>
          </button>
        ))}
      </div>
      {selectedImage ? (
        <div className="modal-backdrop" onClick={() => setSelectedImage(null)} role="presentation">
          <div className="image-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <span className="image-placeholder image-large" />
            <h2>{selectedImage.name}</h2>
            <p>{selectedImage.caption}</p>
            <JsonPreview value={selectedImage.metadata} />
            <Button onClick={() => setSelectedImage(null)} variant="secondary">Close</Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
