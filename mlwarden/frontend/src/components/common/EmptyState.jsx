export function EmptyState({ title, message }) {
  return (
    <div className="state-box">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
