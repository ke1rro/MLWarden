import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button.jsx'

export default function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Page not found</h1>
        <p>The requested prototype route does not exist.</p>
        <Link className="button button-primary button-md full-width" to="/projects">Back to projects</Link>
        <Button variant="secondary" onClick={() => history.back()}>Go back</Button>
      </section>
    </main>
  )
}
