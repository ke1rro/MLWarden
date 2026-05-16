import * as echarts from 'echarts'
import { dataUrlToBlob, saveBlob } from '@/shared/downloads.js'

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}

function sanitizeFilename(value) {
  return String(value || 'chart')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    || 'chart'
}

function createExportNode(width, height) {
  const node = document.createElement('div')
  node.style.height = `${height}px`
  node.style.left = '-10000px'
  node.style.position = 'fixed'
  node.style.top = '0'
  node.style.width = `${width}px`
  document.body.append(node)
  return node
}

function flushChart(chart) {
  chart.getZr?.().flush?.()
}

function serializeRenderedSvg(node) {
  const svg = node.querySelector('svg')
  if (!svg) {
    throw new Error('SVG export failed: ECharts did not render an SVG.')
  }
  let source = new XMLSerializer().serializeToString(svg)
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  return source
}

function getRenderedPngDataUrl(chart, node, backgroundColor) {
  const dataUrl = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor,
  })
  if (dataUrl?.startsWith('data:image/png')) return dataUrl

  const canvasDataUrl = node.querySelector('canvas')?.toDataURL('image/png')
  if (canvasDataUrl?.startsWith('data:image/png')) return canvasDataUrl

  throw new Error('PNG export failed: ECharts did not render a PNG image.')
}

export async function exportChart({ chart, option, format, filename, backgroundColor = '#ffffff' }) {
  if (!chart || !option) return

  const width = Math.max(320, chart.getWidth?.() || 900)
  const height = Math.max(240, chart.getHeight?.() || 420)
  const renderer = format === 'png' ? 'canvas' : 'svg'
  const node = createExportNode(width, height)
  const exportInstance = echarts.init(node, null, { renderer, width, height })

  try {
    exportInstance.setOption({ ...option, animation: false }, true)
    exportInstance.resize({ width, height })
    flushChart(exportInstance)
    await waitForPaint()
    flushChart(exportInstance)

    if (format === 'svg') {
      await saveBlob(
        new Blob([serializeRenderedSvg(node)], { type: 'image/svg+xml' }),
        `${sanitizeFilename(filename)}.svg`,
        'image/svg+xml',
      )
      return
    }

    const dataUrl = getRenderedPngDataUrl(exportInstance, node, backgroundColor)
    await saveBlob(dataUrlToBlob(dataUrl), `${sanitizeFilename(filename)}.png`, 'image/png')
  } finally {
    exportInstance.dispose()
    node.remove()
  }
}
