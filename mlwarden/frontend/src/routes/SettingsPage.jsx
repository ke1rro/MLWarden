import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function SettingsPage() {
  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/projects' }, { label: 'Settings' }]}>
      <PageHeader
        title="Settings"
        subtitle="Read-only local runtime details for this MLWarden frontend."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Frontend</h2>
          <label>
            Runtime
            <input readOnly value="React JavaScript client" />
          </label>
          <label>
            Search
            <input readOnly value="Projects, runs, charts, and artifacts" />
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Charts</h2>
          <label>
            Rendering
            <input readOnly value="ECharts SVG with zoom, pan, restore, PNG/SVG export" />
          </label>
          <label>
            Panels
            <input readOnly value="SDK metadata first, inferred fallback panels when absent" />
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Backend</h2>
          <label>
            API base URL
            <input readOnly value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'} />
          </label>
          <label>
            Authentication
            <input readOnly value="Bearer token from login endpoint" />
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Storage</h2>
          <label>
            Artifact storage
            <input readOnly value="Configured by APP_ARTIFACT_ROOT on the backend" />
          </label>
          <label>
            Chart exports
            <input readOnly value="Browser save picker with download fallback" />
          </label>
        </section>
      </div>
    </AppLayout>
  )
}
