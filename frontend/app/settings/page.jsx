'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import AppDock from '@/components/AppDock'

const distanceLevels = ['Near', 'Medium', 'Far']
const feedbackOptions = ['Voice', 'Tone', 'Both']

export default function SettingsPage() {
  const [voiceVolume, setVoiceVolume] = useState(70)
  const [distanceSensitivity, setDistanceSensitivity] = useState('Medium')
  const [feedbackType, setFeedbackType] = useState('Both')

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Preferences</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.25em]">Settings</h1>
        </div>
        <motion.span
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/60"
        >
          Adaptive Mode
        </motion.span>
      </header>

      <motion.section
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 ml-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto rounded-l-3xl bg-white/5 px-8 pb-32 pt-10 backdrop-blur-2xl"
      >
        <div>
          <h2 className="text-sm uppercase tracking-[0.35em] text-white/50">Voice Volume</h2>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={voiceVolume}
              onChange={(event) => setVoiceVolume(Number(event.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400"
            />
            <span className="w-12 text-right text-lg font-semibold text-teal-200">{voiceVolume}</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">Controls spoken guidance output</p>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-[0.35em] text-white/50">Distance Sensitivity</h2>
          <div className="mt-4 flex gap-3">
            {distanceLevels.map((level) => {
              const isActive = distanceSensitivity === level
              return (
                <button
                  key={level}
                  onClick={() => setDistanceSensitivity(level)}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm tracking-[0.2em] transition-all ${
                    isActive
                      ? 'border-teal-300 bg-teal-400/20 text-teal-100'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  {level}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">Adjusts alert range for detected objects</p>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-[0.35em] text-white/50">Feedback Type</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {feedbackOptions.map((option) => {
              const isActive = feedbackType === option
              return (
                <button
                  key={option}
                  onClick={() => setFeedbackType(option)}
                  className={`rounded-2xl border px-3 py-4 text-xs uppercase tracking-[0.3em] ${
                    isActive
                      ? 'border-indigo-300 bg-indigo-400/20 text-indigo-100'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">Choose how Kora responds</p>
        </div>
      </motion.section>

      <AppDock className="absolute bottom-8 left-1/2 -translate-x-1/2" />
    </div>
  )
}
