import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/useAuth.js'
import { Button } from '../components/common/Button.jsx'
import { Logo } from '../components/common/Logo.jsx'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    window.setTimeout(() => {
      if (!username.trim() || !password.trim()) {
        setError('Enter any username and password for the frontend prototype.')
        setLoading(false)
        return
      }
      login(username.trim())
      navigate(location.state?.from || '/projects', { replace: true })
    }, 350)
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <Logo />
          <p>Self-hosted experiment and workflow tracking.</p>
        </div>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" type="password" />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <Button className="full-width" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}
