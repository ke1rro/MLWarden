export function LoadingState({ message = 'Loading prototype data...' }) {
  return (
    <div className="state-box">
      <span className="spinner" />
      <p>{message}</p>
    </div>
  )
}
