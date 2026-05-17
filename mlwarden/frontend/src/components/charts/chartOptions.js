const baseTextStyle = {
  color: '#475467',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 12,
  fontWeight: 500,
}

const defaultGrid = { left: 56, right: 24, top: 58, bottom: 68 }



function toNumber(value, fallback) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  return value === 'true'
}

function normalizeGrid(grid = {}) {
  return {
    left: toNumber(grid.left, defaultGrid.left),
    right: toNumber(grid.right, defaultGrid.right),
    top: toNumber(grid.top, defaultGrid.top),
    bottom: toNumber(grid.bottom, defaultGrid.bottom),
  }
}

export function parseEchartsOverride(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  return JSON.parse(value)
}

export function normalizeChartConfig(input = {}, defaults = {}) {
  const source = input.source || input.data_source || defaults.source || 'metrics'
  const yAxis = input.yAxis || input.y_axis || input.metric || defaults.yAxis || defaults.metric || ''
  const chartType = input.chartType || input.chart_type || input.type || defaults.chartType || 'line'
  const name = input.name ?? defaults.name ?? ''

  return {
    name,
    chartType,
    source,
    runId: input.runId || input.run_id || defaults.runId || '',
    metric: input.metric || yAxis,
    xAxis: input.xAxis || input.x_axis || defaults.xAxis || 'step',
    yAxis,
    filters: input.filters ?? defaults.filters ?? '',
    title: input.title ?? defaults.title ?? yAxis,
    showTitle: toBoolean(input.showTitle ?? input.show_title, defaults.showTitle ?? true),
    xAxisLabel: input.xAxisLabel ?? input.x_axis_label ?? defaults.xAxisLabel ?? 'Step',
    yAxisLabel: input.yAxisLabel ?? input.y_axis_label ?? defaults.yAxisLabel ?? yAxis,
    showLegend: toBoolean(input.showLegend ?? input.show_legend, defaults.showLegend ?? false),
    showTooltip: toBoolean(input.showTooltip ?? input.show_tooltip, defaults.showTooltip ?? true),
    color: input.color || defaults.color || '#2563eb',
    palette: input.palette || defaults.palette || '',
    fontSize: toNumber(input.fontSize ?? input.font_size, defaults.fontSize ?? 12),
    lineWidth: toNumber(input.lineWidth ?? input.line_width, defaults.lineWidth ?? 2),
    pointSize: toNumber(input.pointSize ?? input.point_size, defaults.pointSize ?? 4),
    smooth: toBoolean(input.smooth, defaults.smooth ?? true),
    area: toBoolean(input.area, defaults.area ?? chartType === 'area'),
    barWidth: toNumber(input.barWidth ?? input.bar_width, defaults.barWidth ?? 18),
    backgroundColor: input.backgroundColor ?? input.background_color ?? defaults.backgroundColor ?? '#ffffff',
    grid: normalizeGrid(input.grid || defaults.grid),
    echartsOptionOverride: input.echartsOptionOverride ?? input.echarts_option_override ?? defaults.echartsOptionOverride ?? {},
    valueUnit: input.valueUnit ?? input.value_unit ?? defaults.valueUnit ?? '',
    useExplicitX: toBoolean(input.useExplicitX ?? input.use_explicit_x, defaults.useExplicitX ?? false),
    highlightBestRun: toBoolean(input.highlightBestRun ?? input.highlight_best_run, defaults.highlightBestRun ?? false),
    bestRunId: input.bestRunId || input.best_run_id || defaults.bestRunId || '',
  }
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return override ?? base
  const next = { ...base }
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof next[key] === 'object' && !Array.isArray(next[key])) {
      next[key] = deepMerge(next[key], value)
    } else {
      next[key] = value
    }
  })
  return next
}

function pointX(point, xAxis, index) {
  if (xAxis === 'timestamp') return point.timestamp || point.created_at || (point.step ?? index)
  if (xAxis === 'step') return point.step ?? index
  return point[xAxis] ?? point.context?.[xAxis] ?? point.step ?? index
}

function pointY(point, yAxis) {
  return point.value ?? point[yAxis] ?? point.context?.[yAxis] ?? null
}

function normalizeSeriesInput(seriesInput, config) {
  if (!seriesInput) return []
  if (Array.isArray(seriesInput) && seriesInput.length && seriesInput[0]?.data) return seriesInput
  if (Array.isArray(seriesInput)) {
    return [{ name: config.yAxis || config.metric || config.title || 'Metric', data: seriesInput }]
  }
  if (typeof seriesInput === 'object') {
    return Object.entries(seriesInput).map(([name, data]) => ({ name, data }))
  }
  return []
}

function paletteFor(config) {
  if (Array.isArray(config.palette)) return config.palette
  if (typeof config.palette === 'string' && config.palette.trim()) {
    return config.palette.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return [config.color]
}

export function buildChartOption(inputConfig, seriesInput = []) {
  const config = normalizeChartConfig(inputConfig)
  const override = parseEchartsOverride(config.echartsOptionOverride)
  const seriesType = config.chartType === 'area' ? 'line' : config.chartType
  const sourceSeries = normalizeSeriesInput(seriesInput, config)
  const useExplicitX = config.useExplicitX || seriesType === 'scatter'
  const xData = useExplicitX ? undefined : sourceSeries[0]?.data?.map((point, index) => pointX(point, config.xAxis, index)) || []
  const chartSeries = sourceSeries.map((source, seriesIndex) => {
    const points = source.data || []
    const data = useExplicitX
      ? points.map((point, index) => [pointX(point, config.xAxis, index), pointY(point, config.yAxis)])
      : points.map((point) => pointY(point, config.yAxis))
    const isBestRun = config.highlightBestRun && source.runId && source.runId === config.bestRunId

    return {
      id: source.runId || source.id,
      name: source.name || config.yAxis || config.title || `Series ${seriesIndex + 1}`,
      type: seriesType,
      data,
      smooth: seriesType === 'line' ? config.smooth : false,
      symbolSize: config.pointSize,
      lineStyle: { width: isBestRun ? config.lineWidth + 2 : config.lineWidth },
      areaStyle: config.area || config.chartType === 'area' ? { opacity: 0.14 } : undefined,
      barMaxWidth: config.barWidth,
      z: isBestRun ? 4 : 1,
    }
  })
  const fontStyle = { ...baseTextStyle, fontSize: config.fontSize }
  const xAxisType = useExplicitX ? (config.xAxis === 'timestamp' ? 'time' : 'value') : 'category'

  const option = {
    animation: false,
    backgroundColor: config.backgroundColor,
    color: paletteFor(config),
    title: {
      show: config.showTitle,
      text: config.title,
      left: 0,
      textStyle: { color: '#101828', fontSize: config.fontSize + 2, fontWeight: 750 },
    },
    legend: {
      show: config.showLegend,
      top: 4,
      right: 8,
      textStyle: fontStyle,
    },
    tooltip: {
      show: config.showTooltip,
      trigger: seriesType === 'scatter' ? 'item' : 'axis',
      confine: true,
      valueFormatter: config.valueUnit ? (value) => `${value} ${config.valueUnit}` : undefined,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseMove: false, moveOnMouseWheel: false, zoomOnMouseWheel: true },
      { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 16, bottom: 4 },
    ],
    grid: config.grid,
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: false },
        restore: {},
      },
      iconStyle: { borderColor: '#667085' },
      itemSize: 14,
      right: 4,
      top: 24,
    },
    xAxis: {
      name: config.xAxisLabel,
      nameLocation: 'middle',
      nameGap: 38,
      type: xAxisType,
      data: xData,
      boundaryGap: seriesType === 'bar',
      axisLabel: { ...fontStyle, margin: 8 },
      nameTextStyle: { ...fontStyle, padding: [0, 0, 0, 0] },
      axisLine: { lineStyle: { color: '#d9dee7' } },
    },
    yAxis: {
      name: config.yAxisLabel,
      nameLocation: 'middle',
      nameGap: 42,
      type: 'value',
      scale: true,
      axisLabel: fontStyle,
      nameTextStyle: fontStyle,
      splitLine: { lineStyle: { color: '#eef1f5' } },
    },
    series: chartSeries,
  }

  return deepMerge(option, override)
}

export function optionHasSeriesData(option) {
  return Boolean(option?.series?.some((series) => Array.isArray(series.data) && series.data.length))
}
