import { Button } from '@/components/common/Button.jsx'
import { Modal } from '@/components/common/Modal.jsx'

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onCancel, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="modal-copy">{message}</p>
    </Modal>
  )
}
