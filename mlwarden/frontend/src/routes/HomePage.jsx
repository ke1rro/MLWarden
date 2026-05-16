import { ArrowRight, Boxes, LineChart, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo.jsx'
import { ShaderAnimation } from '@/components/ui/ShaderAnimation.jsx'

export default function HomePage() {
  return (
    <main className="home-page">
      <ShaderAnimation />
      <div className="home-grid-overlay" />
      <header className="home-nav">
        <Logo className="home-logo" />
        <div className="home-nav-actions">
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
        </div>
      </section>

      <section className="home-console" aria-label="MLWarden live workspace preview">
        <div className="console-top">
          <span />
          <span />
          <span />
          <strong>local workspace / active run</strong>
        </div>
        <div className="console-body">
          <article className="console-chart large">
            <header>
              <LineChart size={16} />
              validation loss
            </header>
            <div className="mini-chart-preview">
              <span>0.50</span>
              <span>0.25</span>
              <span>0.10</span>
              <div className="mini-chart-curve" />
              <small>epoch 1</small>
              <small>epoch 5</small>
              <small>epoch 10</small>
            </div>
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
        </div>
      </section>
    </main>
  )
}
