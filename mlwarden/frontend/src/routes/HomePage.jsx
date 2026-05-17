import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Activity, ArrowRight, Boxes, Image, LineChart, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo.jsx'
import { ShaderAnimation } from '@/components/ui/ShaderAnimation.jsx'
import { AppFooter } from '@/components/layout/AppFooter.jsx'

function HomeDemoChart() {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return undefined
    const chart = echarts.init(chartRef.current, null, { renderer: 'svg' })
    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      color: ['#38bdf8'],
      grid: { left: 42, right: 42, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', confine: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['0', '10', '20', '30', '40', '50', '60'],
        axisLabel: { color: 'rgba(255,255,255,0.58)', fontFamily: 'SFMono-Regular, Consolas, monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: 'rgba(255,255,255,0.58)', fontFamily: 'SFMono-Regular, Consolas, monospace' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      series: [{
        name: 'validation loss',
        type: 'line',
        data: [0.94, 0.71, 0.53, 0.39, 0.31, 0.26, 0.22],
        smooth: true,
        symbolSize: 5,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(56,189,248,0.16)' },
      }],
    })
    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)
    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [])

  return <div className="home-demo-chart" ref={chartRef} />
}

export default function HomePage() {
  return (
    <main className="home-page">
      <ShaderAnimation />
      <div className="home-grid-overlay" />
      <header className="home-nav">
        <Logo className="home-logo" />
        <div className="home-nav-actions">
          <Link className="home-button secondary" to="/login">Sign in</Link>
        </div>
      </header>

      <section className="home-hero" id="workspace">
        <h1>Watch training as it happens.</h1>
        <p>
          Monitor local ML runs in real time.<br />
          Track metrics, logs, artifacts, and host telemetry from one local workspace.
        </p>
        <div className="home-actions">
          <Link className="home-button primary" to="/workspace">
            Open workspace
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="home-console" aria-label="MLWarden live workspace preview">
        <div className="console-top">
          <span />
          <span />
          <span />
          <strong>local workspace / active run</strong>
        </div>
        <div className="console-body">
          <article className="console-chart large">
            <header>
              <LineChart size={16} />
              validation loss
            </header>
            <HomeDemoChart />
          </article>
          <article className="console-card">
            <ShieldCheck size={18} />
            <strong>Running</strong>
            <small>epoch 42 / 90 · gpu-worker-01</small>
          </article>
          <article className="console-card">
            <Boxes size={18} />
            <strong>checkpoint.pt</strong>
            <small>94.2 MB uploaded</small>
          </article>
          <article className="console-card">
            <Image size={18} />
            <strong>predictions</strong>
            <small>batch preview at step 1200</small>
          </article>
          <article className="console-card">
            <Activity size={18} />
            <strong>GPU usage</strong>
            <small>87% · gpu-worker-01</small>
          </article>
        </div>
      </section>
      <AppFooter />
    </main>
  )
}
