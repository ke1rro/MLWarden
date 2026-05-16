import { useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    instanceName: localStorage.getItem('mlwarden.instanceName') || 'MLWarden local',
    density: localStorage.getItem('mlwarden.density') || 'comfortable',
    showHints: localStorage.getItem('mlwarden.showHints') !== 'false',
    reduceAnimations: localStorage.getItem('mlwarden.reduceAnimations') === 'true',
  })
  const [saved, setSaved] = useState(false)

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    localStorage.setItem('mlwarden.instanceName', settings.instanceName)
    localStorage.setItem('mlwarden.density', settings.density)
    localStorage.setItem('mlwarden.showHints', String(settings.showHints))
    localStorage.setItem('mlwarden.reduceAnimations', String(settings.reduceAnimations))
    setSaved(true)
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/projects' }, { label: 'Settings' }]}>
      <PageHeader
        title="Settings"
        subtitle="Local UI preferences and read-only backend connection details."
        actions={<Button onClick={handleSave}>{saved ? 'Saved' : 'Save settings'}</Button>}
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>General</h2>
          <label>
            Instance name
            <input value={settings.instanceName} onChange={(event) => updateSetting('instanceName', event.target.value)} />
          </label>
          <label>
            Density
            <select value={settings.density} onChange={(event) => updateSetting('density', event.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Interface</h2>
          <label className="settings-toggle">
            <input checked={settings.showHints} onChange={(event) => updateSetting('showHints', event.target.checked)} type="checkbox" />
            Show empty-state hints
          </label>
          <label className="settings-toggle">
            <input checked={settings.reduceAnimations} onChange={(event) => updateSetting('reduceAnimations', event.target.checked)} type="checkbox" />
            Reduce nonessential animations
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
            Chart/report exports
            <input readOnly value="Browser save picker with download fallback" />
          </label>
        </section>
      </div>
    </AppLayout>
  )
}
