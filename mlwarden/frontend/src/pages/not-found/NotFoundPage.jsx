import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>404</h1>
      <p>Сторінку не знайдено.</p>
      <Link to="/">Повернутися на головну</Link>
    </main>
  )
}
