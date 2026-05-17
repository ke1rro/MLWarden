import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { buildChartOption, optionHasSeriesData } from './chartOptions.js'

export function MetricChart({ config, series, option, renderer = 'svg', onReady, placeholder }) {
  const chartRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const onReadyRef = useRef(onReady)

  const resolvedOption = useMemo(() => {
    if (option) return option
    if (!config || !series) return null
    return buildChartOption(config, series)
  }, [config, option, series])
  const hasData = optionHasSeriesData(resolvedOption)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    if (!chartRef.current || !hasData) return undefined

    const chart = echarts.init(chartRef.current, null, { renderer })
    chartInstanceRef.current = chart
    onReadyRef.current?.(chart)

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      onReadyRef.current?.(null)
      chartInstanceRef.current = null
      chart.dispose()
    }
  }, [hasData, renderer])

  useEffect(() => {
    if (!chartInstanceRef.current || !resolvedOption) return
    chartInstanceRef.current.setOption(resolvedOption, true)
  }, [resolvedOption])

  if (!resolvedOption) {
    return <EmptyState title={placeholder || 'Waiting for data…'} message="" />
  }

  if (!hasData) {
    return <EmptyState title="No metrics logged yet." message="Start a worker run or log metrics through the Python client." />
  }

  return <div className="metric-chart" ref={chartRef} />
}
