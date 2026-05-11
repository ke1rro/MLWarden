import { PageHeader } from '../components/common/PageHeader.jsx'
import { AppLayout } from '../components/layout/AppLayout.jsx'

const sections = [
  ['General', 'Instance name', 'MLWarden local'],
  ['Authentication', 'Users source', 'APP_USERS environment variable'],
  ['Worker API key', 'Static key', 'dev-api-key'],
  ['Artifact storage', 'Local root', '/data/artifacts'],
  ['Appearance', 'Density', 'Compact'],
  ['About', 'Mode', 'Frontend prototype with mock data'],
]

export default function SettingsPage() {
  return (
    <AppLayout breadcrumbs={['MLWarden', 'Settings']}>
      <PageHeader title="Settings" subtitle="Visual-only self-hosted application settings." />
      <div className="settings-grid">
        {sections.map(([title, label, value]) => (
          <section className="panel settings-panel" key={title}>
            <h2>{title}</h2>
            <label>
              {label}
              <input disabled value={value} readOnly />
            </label>
          </section>
        ))}
      </div>
    </AppLayout>
  )
}
