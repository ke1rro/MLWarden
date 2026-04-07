import React from 'react'
import { motion as Motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { AuroraBackground } from './aurora-background'

export function AuroraBackgroundDemo() {
  return (
    <AuroraBackground>
      <Motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: 'easeInOut',
        }}
        className="aurora-demo-content"
      >
        <h2 className="aurora-demo-title">Background lights are cool you know.</h2>
        <p className="aurora-demo-subtitle">And this, is chemical burn.</p>
        <button className="aurora-demo-btn" type="button">
          <Sparkles size={16} />
          Debug now
        </button>
      </Motion.div>
    </AuroraBackground>
  )
}
