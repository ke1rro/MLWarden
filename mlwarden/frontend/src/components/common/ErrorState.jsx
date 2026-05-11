export function ErrorState({ title = 'Something went wrong', message }) {
  return (
    <div className="state-box state-error">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
