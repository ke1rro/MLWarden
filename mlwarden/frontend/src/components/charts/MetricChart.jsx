import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'

const axisLabel = {
  color: '#475467',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 12,
  fontWeight: 500,
}

export function MetricChart({ title, series, type = 'line', area = false, onReady }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current || !series?.length) return undefined

    const chart = echarts.init(chartRef.current, null, { renderer: 'svg' })
    const points = series.map((point) => point.step)
    const values = series.map((point) => point.value)

    chart.setOption({
      animation: false,
      color: ['#2563eb'],
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 18, bottom: 8 },
      ],
      grid: { left: 44, right: 16, top: 16, bottom: 48 },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: false },
          restore: {},
        },
        iconStyle: { borderColor: '#667085' },
        itemSize: 14,
        right: 4,
        top: 0,
      },
      tooltip: { trigger: 'axis', confine: true },
      xAxis: {
        type: 'category',
        data: points,
        boundaryGap: type === 'bar',
        axisLabel,
        axisLine: { lineStyle: { color: '#d9dee7' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel,
        splitLine: { lineStyle: { color: '#eef1f5' } },
      },
      series: [
        {
          name: title,
          type: type === 'area' ? 'line' : type,
          data: values,
          smooth: type !== 'bar',
          symbolSize: 4,
          lineStyle: { width: 2 },
          areaStyle: area || type === 'area' ? { opacity: 0.12 } : undefined,
          barMaxWidth: 18,
        },
      ],
    })
    onReady?.(chart)

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      onReady?.(null)
      chart.dispose()
    }
  }, [area, onReady, series, title, type])

  if (!series) {
    return <ErrorState title="Invalid chart config" message="No metric series was found for this panel." />
  }

  if (!series.length) {
    return <EmptyState title="No metrics logged yet." message="Start a worker run or log metrics through the Python client." />
  }

  return <div className="metric-chart" ref={chartRef} />
}
