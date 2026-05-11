import { ArrowRight, BarChart3, Boxes, LineChart, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/common/Logo.jsx'
import { ShaderAnimation } from '../components/ui/ShaderAnimation.jsx'

const metrics = [
  ['8.4k', 'metric points'],
  ['312', 'artifacts'],
  ['42', 'live runs'],
]

export default function HomePage() {
  return (
    <main className="home-page">
      <ShaderAnimation />
      <div className="home-grid-overlay" />
      <header className="home-nav">
        <Logo className="home-logo" />
        <nav>
          <a href="#workspace">Workspace</a>
          <a href="#signals">Signals</a>
          <Link to="/settings">Settings</Link>
        </nav>
        <div className="home-nav-actions">
          <a className="home-star" href="https://github.com" rel="noreferrer" target="_blank">
            <Sparkles size={16} />
            Prototype
          </a>
          <Link className="home-button secondary" to="/login">Sign in</Link>
        </div>
      </header>

      <section className="home-hero" id="workspace">
        <div className="home-kicker">
          <Sparkles size={16} />
          Self-hosted experiment intelligence
        </div>
        <h1>Track every run, artifact, and signal before the model drifts.</h1>
        <p>
          MLWarden gives small ML teams a dense local workspace for metrics, logs, tables,
          images, and workflow events without shipping experiment data to a SaaS platform.
        </p>
        <div className="home-actions">
          <Link className="home-button primary" to="/projects">
            Open workspace
            <ArrowRight size={17} />
          </Link>
          <Link className="home-button ghost" to="/runs/run-dulcet-snowflake-18">
            View demo run
          </Link>
        </div>
        <div className="home-proof-row">
          {metrics.map(([value, label]) => (
            <span key={label}>
              <strong>{value}</strong>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="home-console" aria-label="MLWarden live workspace preview">
        <div className="console-top">
          <span />
          <span />
          <span />
          <strong>learnable-wavelets / dulcet-snowflake-18</strong>
        </div>
        <div className="console-body">
          <article className="console-chart large">
            <header>
              <LineChart size={16} />
              val.psnr
            </header>
            <div className="mini-chart-line" />
          </article>
          <article className="console-card">
            <ShieldCheck size={18} />
            <strong>Finished</strong>
            <small>14m 32s · gpu-worker-01</small>
          </article>
          <article className="console-card">
            <Boxes size={18} />
            <strong>model.pt</strong>
            <small>94.2 MB uploaded</small>
          </article>
          <article className="console-chart">
            <header>
              <BarChart3 size={16} />
              throughput
            </header>
            <div className="mini-bars">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
