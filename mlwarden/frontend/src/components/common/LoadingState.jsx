export function LoadingState({ message = 'Loading backend data...' }) {
  return (
    <div className="state-box">
      <span className="spinner" />
      <p>{message}</p>
    </div>
  )
}
