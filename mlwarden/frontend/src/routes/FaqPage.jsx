import { useMemo, useState } from 'react'
import { API_BASE_URL } from '@/api/client.js'
import { Button } from '@/components/common/Button.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

const installCommand = 'pip install git+https://github.com/ke1rro/MLWarden.git'

const questions = [
  {
    question: 'Where is my experiment data stored?',
    answer: 'All your data, metrics, and artifacts are stored completely locally on your machine or self-hosted server. Your experiment data never leaves your infrastructure, ensuring complete privacy and offline capabilities.',
  },
  {
    question: 'How do I organize my experiments?',
    answer: 'You can group your runs into Projects. Within a project, you can use tags such as dev, cnn, or baseline to filter and search for specific runs easily.',
  },
  {
    question: 'Can I log rich media like images?',
    answer: 'Yes. You can use run.log_table() to log structured data, which can include references to local images, text samples, or validation results to compare outputs across epochs.',
  },
  {
    question: 'How do I save and manage model checkpoints?',
    answer: 'Use the run.log_artifact() method. This tracks local files such as .pt, .h5, or .onnx files and links them directly to the experiment run that produced them.',
  },
  {
    question: 'Does MLWarden work offline?',
    answer: 'Yes. Since MLWarden runs a local server, you can continue to log and visualize experiments even without an internet connection.',
  },
]

export default function FaqPage() {
  const [copied, setCopied] = useState(false)
  const [installCopied, setInstallCopied] = useState(false)
  const baseUrl = API_BASE_URL === '' ? window.location.origin : API_BASE_URL
  const sdkSnippet = useMemo(() => `from mlwarden import Tracker

tracker = Tracker(
    base_url="${baseUrl}",
    api_key="dev-api-key",
    project="demo-project",
)

run = tracker.create_run(name="baseline", tags=["dev", "cnn"])
run.start()
run.define_panel("Validation loss", "val.loss", chart_type="area", size="lg")
run.log_metric("val.loss", 0.218, step=10)
run.log_table("validation", [{"image": "001", "psnr": 30.4}])
run.log_artifact("model.pt", artifact_path="checkpoints/model.pt")
run.finish(summary={"final_loss": 0.218})`, [baseUrl])

  async function handleCopy() {
    await navigator.clipboard?.writeText(sdkSnippet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  async function handleInstallCopy() {
    await navigator.clipboard?.writeText(installCommand)
    setInstallCopied(true)
    window.setTimeout(() => setInstallCopied(false), 1600)
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'FAQ' }]}
      title="FAQ"
      subtitle="Answers and SDK reference for local MLWarden experiment tracking."
    >
      <div className="faq-page">
        {/* 1. What is MLWarden? */}
        <section className="panel faq-section">
          <header className="section-header">
            <div>
              <h2>What is MLWarden?</h2>
              <p>MLWarden is a lightweight, local-first platform for tracking machine learning experiments. It allows you to visualize metrics, manage model artifacts, and compare runs without relying on cloud services.</p>
            </div>
          </header>
        </section>

        {/* 2. How to install SDK? */}
        <section className="panel faq-section">
          <header className="section-header">
            <div>
              <h2>How to install SDK?</h2>
              <p>To install SDK, use pip package manager with the following command:</p>
            </div>
            <Button onClick={handleInstallCopy} variant="secondary">{installCopied ? 'Copied' : 'Copy command'}</Button>
          </header>
          <pre className="faq-code">{installCommand}</pre>
        </section>

        {/* 3. How to use SDK? */}
        <section className="panel faq-section">
          <header className="section-header">
            <div>
              <h2>How to use SDK?</h2>
              <p>Minimal Python client flow for sending local experiment data to this workspace.</p>
            </div>
            <Button onClick={handleCopy} variant="secondary">{copied ? 'Copied' : 'Copy snippet'}</Button>
          </header>
          <pre className="faq-code">{sdkSnippet}</pre>
        </section>

        <section className="faq-list">
          {questions.map((item) => (
            <article className="panel faq-item" key={item.question}>
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </article>
          ))}
        </section>
      </div>
    </AppLayout>
  )
}
