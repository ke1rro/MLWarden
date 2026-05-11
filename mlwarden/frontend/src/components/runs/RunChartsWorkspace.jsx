import { Plus, Settings, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { SearchInput } from '../common/SearchInput.jsx'
import { Toolbar } from '../common/Toolbar.jsx'
import { IconButton } from '../common/IconButton.jsx'
import { ChartGrid } from '../charts/ChartGrid.jsx'

const defaultPanels = [
  'val.psnr',
  'val.loss',
  'val.best_psnr',
  'train.loss',
  'epoch',
  'learning_rate',
  'gpu.memory_mb',
  'throughput.samples_per_sec',
]

export function RunChartsWorkspace({ metricSeries }) {
  const [query, setQuery] = useState('')
  const [panels, setPanels] = useState(defaultPanels)

  const visiblePanels = panels.filter((panel) => panel.toLowerCase().includes(query.toLowerCase()))
  const availablePanels = Object.keys(metricSeries).filter((panel) => !panels.includes(panel))

  function handleAddPanel() {
    const nextPanel = availablePanels[0] || defaultPanels.find((panel) => !panels.includes(panel)) || 'val.psnr'
    setPanels((current) => [...current, nextPanel])
  }

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search panels with regex" />
        <IconButton label="Panel settings" icon={Settings} />
        <IconButton label="More panel controls" icon={SlidersHorizontal} />
        <Button variant="secondary">New report</Button>
        <Button onClick={handleAddPanel}><Plus size={15} /> Add panel</Button>
      </Toolbar>
      <ChartGrid panels={visiblePanels} metricSeries={metricSeries} onRemovePanel={(panel) => setPanels((current) => current.filter((item) => item !== panel))} />
    </section>
  )
}
