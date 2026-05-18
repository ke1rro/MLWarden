const runColorPalette = [
  '#5387dd',
  '#ffb000',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#17becf',
  '#bcbd22',
  '#4e79a7',
  '#f28e2b',
  '#59a14f',
  '#e15759',
  '#76b7b2',
  '#edc948',
  '#b07aa1',
  '#9c755f',
]

function hashString(value) {
  return String(value || '')
    .split('')
    .reduce((hash, character) => {
      const next = (hash << 5) - hash + character.charCodeAt(0)
      return next | 0
    }, 0)
}

function runColorForId(value, offset = 0) {
  const index = Math.abs(hashString(value) + offset) % runColorPalette.length
  return runColorPalette[index]
}

export function runColorForRun(run, offset = 0) {
  return runColorForId(run?.id || run?.name || 'run', offset)
}

export function runPaletteForRuns(runs = []) {
  const used = new Set()
  return runs.map((run, index) => {
    const key = run?.id || run?.name || `run-${index}`
    for (let offset = 0; offset < runColorPalette.length; offset += 1) {
      const color = runColorForId(key, offset)
      if (!used.has(color)) {
        used.add(color)
        return color
      }
    }
    return runColorPalette[index % runColorPalette.length]
  })
}
