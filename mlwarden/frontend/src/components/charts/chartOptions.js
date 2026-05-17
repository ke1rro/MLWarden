const baseTextStyle = {
  color: '#475467',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 12,
  fontWeight: 500,
}

const defaultGrid = { left: 48, right: 18, top: 44, bottom: 46 }

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

function parseJsonObject(value, label) {
  if (!value) return {}
  if (typeof value === 'object') {
    if (Array.isArray(value)) throw new Error(`${label} must be a JSON object.`)
    return value
  }
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`)
  }
  return parsed
}

export function parseEchartsOverride(value) {
  return parseJsonObject(value, 'ECharts override')
}

export function parseChartFilters(value) {
  return parseJsonObject(value, 'Filters')
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
    groupBy: input.groupBy ?? input.group_by ?? defaults.groupBy ?? '',
    filters: input.filters ?? defaults.filters ?? '',
    title: input.title ?? defaults.title ?? yAxis,
    subtitle: input.subtitle ?? input.subTitle ?? input.sub_title ?? defaults.subtitle ?? '',
    showTitle: toBoolean(input.showTitle ?? input.show_title, defaults.showTitle ?? true),
    showXAxisLabel: toBoolean(input.showXAxisLabel ?? input.show_x_axis_label ?? input.showXAxis ?? input.show_x_axis, defaults.showXAxisLabel ?? defaults.showXAxis ?? false),
    showYAxisLabel: toBoolean(input.showYAxisLabel ?? input.show_y_axis_label ?? input.showYAxis ?? input.show_y_axis, defaults.showYAxisLabel ?? defaults.showYAxis ?? false),
    xAxisLabel: input.xAxisLabel ?? input.x_axis_label ?? defaults.xAxisLabel ?? 'Step',
    yAxisLabel: input.yAxisLabel ?? input.y_axis_label ?? defaults.yAxisLabel ?? yAxis,
    showLegend: toBoolean(input.showLegend ?? input.show_legend, defaults.showLegend ?? false),
    showTooltip: toBoolean(input.showTooltip ?? input.show_tooltip, defaults.showTooltip ?? true),
    showToolbox: toBoolean(input.showToolbox ?? input.show_toolbox, defaults.showToolbox ?? false),
    showDataZoom: toBoolean(input.showDataZoom ?? input.show_data_zoom, defaults.showDataZoom ?? false),
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
  return pointValue(point, xAxis) ?? point.step ?? index
}

function pointY(point, yAxis) {
  return point.value ?? pointValue(point, yAxis) ?? null
}

function valueAtPath(source, path) {
  if (!source || !path) return undefined
  return String(path).split('.').reduce((value, segment) => value?.[segment], source)
}

function pointValue(point, field) {
  if (!field) return undefined
  return point?.[field] ?? point?.context?.[field] ?? valueAtPath(point, field) ?? valueAtPath(point?.context, field)
}

function seriesValue(series, field) {
  if (!field) return undefined
  if (field === 'run' || field === 'runName') return series.name
  return series?.[field] ?? valueAtPath(series, field)
}

function valueMatches(actual, expected) {
  if (Array.isArray(expected)) return expected.some((item) => valueMatches(actual, item))
  if (actual === undefined || actual === null) return expected === actual
  if (expected && typeof expected === 'object') {
    const min = expected.min ?? expected.gte
    const max = expected.max ?? expected.lte
    const gt = expected.gt
    const lt = expected.lt
    if (min !== undefined && Number(actual) < Number(min)) return false
    if (max !== undefined && Number(actual) > Number(max)) return false
    if (gt !== undefined && Number(actual) <= Number(gt)) return false
    if (lt !== undefined && Number(actual) >= Number(lt)) return false
    if (expected.eq !== undefined) return valueMatches(actual, expected.eq)
    return true
  }
  return String(actual) === String(expected)
}

function filterSeriesData(series, filters) {
  const entries = Object.entries(filters)
  if (!entries.length) return series
  return series.map((source) => ({
    ...source,
    data: (source.data || []).filter((point) =>
      entries.every(([field, expected]) => valueMatches(pointValue(point, field) ?? seriesValue(source, field), expected)),
    ),
  }))
}

function groupSeriesData(series, config) {
  const groupBy = String(config.groupBy || '').trim()
  if (!groupBy) return series

  return series.flatMap((source) => {
    const buckets = new Map()
    ;(source.data || []).forEach((point) => {
      const rawValue = pointValue(point, groupBy) ?? seriesValue(source, groupBy)
      const groupValue = rawValue === undefined || rawValue === null || rawValue === '' ? 'ungrouped' : String(rawValue)
      if (!buckets.has(groupValue)) buckets.set(groupValue, [])
      buckets.get(groupValue).push(point)
    })
    if (buckets.size === 1 && buckets.has('ungrouped')) return [source]
    const baseName = source.name || config.yAxis || config.metric || config.title || 'Series'
    return [...buckets.entries()].map(([groupValue, data]) => ({
      ...source,
      id: `${source.id || source.runId || baseName}-${groupValue}`,
      name: `${baseName} · ${groupValue}`,
      data,
    }))
  })
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

function prepareSeriesInput(seriesInput, config) {
  const filters = parseChartFilters(config.filters)
  const sourceSeries = normalizeSeriesInput(seriesInput, config)
  return groupSeriesData(filterSeriesData(sourceSeries, filters), config)
}

export function buildChartOption(inputConfig, seriesInput = []) {
  const config = normalizeChartConfig(inputConfig)
  const override = parseEchartsOverride(config.echartsOptionOverride)
  const seriesType = config.chartType === 'area' ? 'line' : config.chartType
  const sourceSeries = prepareSeriesInput(seriesInput, config)
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
      color: source.color,
      smooth: seriesType === 'line' ? config.smooth : false,
      symbolSize: config.pointSize,
      itemStyle: source.color ? { color: source.color } : undefined,
      lineStyle: { width: isBestRun ? config.lineWidth + 2 : config.lineWidth, color: source.color },
      areaStyle: config.area || config.chartType === 'area' ? { opacity: 0.14, color: source.color } : undefined,
      barMaxWidth: config.barWidth,
      z: isBestRun ? 4 : 1,
    }
  })
  const fontStyle = { ...baseTextStyle, fontSize: config.fontSize }
  const xAxisType = useExplicitX ? (config.xAxis === 'timestamp' ? 'time' : 'value') : 'category'
  const grid = {
    ...config.grid,
    bottom: config.showDataZoom ? Math.max(config.grid.bottom, 88) : config.grid.bottom,
  }

  const option = {
    animation: false,
    backgroundColor: config.backgroundColor,
    color: paletteFor(config),
    title: {
      show: config.showTitle,
      text: config.title,
      subtext: config.subtitle,
      left: 0,
      textStyle: { color: '#101828', fontSize: config.fontSize + 2, fontWeight: 750 },
      subtextStyle: { ...fontStyle, fontWeight: 500 },
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
    dataZoom: config.showDataZoom
      ? [
          { type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseMove: false, moveOnMouseWheel: false, zoomOnMouseWheel: true },
          { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 16, bottom: 4 },
        ]
      : [],
    grid,
    toolbox: {
      show: config.showToolbox,
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
      show: true,
      name: config.showXAxisLabel ? config.xAxisLabel : '',
      nameLocation: 'middle',
      nameGap: 28,
      type: xAxisType,
      data: xData,
      boundaryGap: seriesType === 'bar',
      axisLabel: { ...fontStyle, margin: 8 },
      nameTextStyle: { ...fontStyle, padding: [0, 0, 0, 0] },
      axisLine: { lineStyle: { color: '#d9dee7' } },
    },
    yAxis: {
      show: true,
      name: config.showYAxisLabel ? config.yAxisLabel : '',
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
