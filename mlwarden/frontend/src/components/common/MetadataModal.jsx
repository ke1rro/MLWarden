import { Button } from '@/components/common/Button.jsx'
import { Modal } from '@/components/common/Modal.jsx'

export function MetadataModal({ title = 'Metadata', value, onClose }) {
  const json = JSON.stringify(value || {}, null, 2)

  return (
    <Modal
      title={title}
      description="Structured metadata for this item."
      onClose={onClose}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <pre className="metadata-panel">{json}</pre>
    </Modal>
  )
}
