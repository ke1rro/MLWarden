import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/useAuth.js'
import { Button } from '@/components/common/Button.jsx'
import { Logo } from '@/components/common/Logo.jsx'

export default function LoginPage() {
  const { isAuthenticated, isBootstrapping, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated && !isBootstrapping) {
    return <Navigate to="/projects" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username.trim() || !password.trim()) {
        setError('Enter a username and password.')
        return
      }
      await login(username.trim(), password)
      navigate(location.state?.from || '/projects', { replace: true })
    } catch (err) {
      setError(err.message || 'Sign in failed.')
    } finally {
      setLoading(false)
    }
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
