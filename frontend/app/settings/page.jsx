'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import AppDock from '@/components/AppDock'

const distanceLevels = ['Near', 'Medium', 'Far']
const feedbackOptions = ['Voice', 'Tone', 'Both']
const guidanceProfiles = [
  {
    id: 'everyday',
    title: 'Everyday Clarity',
    description: 'Balanced cues for errands, commuting, and indoor navigation.',
    detail: 'Keeps narration concise while surfacing important obstacles.',
  },
  {
    id: 'outdoor',
    title: 'Outdoor Explorer',
    description: 'Expands distance scanning and highlights motion around you.',
    detail: 'Designed for parks, crosswalks, and wide-open spaces.',
  },
  {
    id: 'quiet',
    title: 'Quiet Mode',
    description: 'Soft tone prompts with emphasis on haptic nudges.',
    detail: 'Ideal for libraries, transit, or low-volume environments.',
  },
]

const routineSlots = [
  { id: 'morning', label: 'Morning orientation', time: '8:00 AM' },
  { id: 'afternoon', label: 'Afternoon refresh', time: '1:30 PM' },
  { id: 'evening', label: 'Evening wrap-up', time: '8:30 PM' },
]

export default function SettingsPage() {
  const [voiceVolume, setVoiceVolume] = useState(70)
  const [voiceTone, setVoiceTone] = useState('Balanced')
  const [distanceSensitivity, setDistanceSensitivity] = useState('Medium')
  const [feedbackType, setFeedbackType] = useState('Both')
  const [guidanceProfile, setGuidanceProfile] = useState('everyday')
  const [hapticPulse, setHapticPulse] = useState(true)
  const [priorityAlerts, setPriorityAlerts] = useState(true)
  const [autoCapture, setAutoCapture] = useState(false)
  const [routineReminders, setRoutineReminders] = useState(() => new Set(['morning', 'evening']))

  const toneDescriptions = useMemo(
    () => ({
      Calm: 'Lower pitch voice with longer pauses between updates.',
      Balanced: 'Default tone that adapts to ambient noise.',
      Bright: 'Higher energy delivery with crisp articulation.',
    }),
    []
  )

  const toggleRoutine = (id) => {
    setRoutineReminders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-40 pt-32 sm:px-10 lg:px-16">
        <header className="flex flex-col gap-2 text-left">
          <span className="text-xs uppercase tracking-[0.4em] text-white/60">System preferences</span>
          <h1 className="text-3xl font-semibold tracking-[0.25em] sm:text-4xl">Personalize Kora</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/60">
            Configure how guidance sounds, when to receive reminders, and which cues matter most. Your selections are saved to this device and instantly applied to live sessions.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Voice volume</h2>
                <p className="mt-1 text-xs text-white/40">Adjust spoken guidance output</p>
              </div>
              <span className="text-lg font-semibold text-teal-200">{voiceVolume}%</span>
            </header>
            <input
              type="range"
              min="0"
              max="100"
              value={voiceVolume}
              onChange={(event) => setVoiceVolume(Number(event.target.value))}
              className="mt-6 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400"
              aria-label="Voice volume"
            />
            <div className="mt-5 flex gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
              <span>Ambient aware</span>
              <span>Noise gate active</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Voice tone</h2>
                <p className="mt-1 text-xs text-white/40">Choose vocal character</p>
              </div>
            </header>
            <div className="mt-4 flex gap-3">
              {['Calm', 'Balanced', 'Bright'].map((tone) => {
                const isActive = voiceTone === tone
                return (
                  <button
                    key={tone}
                    onClick={() => setVoiceTone(tone)}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm tracking-[0.2em] transition-all ${
                      isActive
                        ? 'border-indigo-300 bg-indigo-400/20 text-indigo-100'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                    type="button"
                  >
                    {tone}
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/50">{toneDescriptions[voiceTone]}</p>
          </motion.div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Guidance profile</h2>
                <p className="mt-1 text-xs text-white/40">Match cues to your environment</p>
              </div>
            </header>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {guidanceProfiles.map((profile) => {
                const isActive = guidanceProfile === profile.id
                return (
                  <button
                    key={profile.id}
                    onClick={() => setGuidanceProfile(profile.id)}
                    className={`flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-teal-300 bg-teal-400/20 text-teal-50 shadow-[0_20px_45px_rgba(45,212,191,0.25)]'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                    }`}
                    type="button"
                    aria-pressed={isActive}
                  >
                    <span className="text-xs uppercase tracking-[0.35em] text-white/60">{profile.title}</span>
                    <span className="text-sm leading-relaxed text-white/70">{profile.description}</span>
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">{profile.detail}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <div>
              <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Distance sensitivity</h2>
              <p className="mt-1 text-xs text-white/40">Adjust alert range for detected objects</p>
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
                      type="button"
                    >
                      {level}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Feedback type</h2>
              <p className="mt-1 text-xs text-white/40">Choose how Kora responds</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {feedbackOptions.map((option) => {
                  const isActive = feedbackType === option
                  return (
                    <button
                      key={option}
                      onClick={() => setFeedbackType(option)}
                      className={`rounded-2xl border px-3 py-4 text-xs uppercase tracking-[0.3em] transition-all ${
                        isActive
                          ? 'border-indigo-300 bg-indigo-400/20 text-indigo-100'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                      }`}
                      type="button"
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Accessibility cues</h2>
                <p className="mt-1 text-xs text-white/40">Layer tactile prompts with audio</p>
              </div>
            </header>
            <div className="mt-5 space-y-4 text-sm text-white/70">
              <button
                type="button"
                onClick={() => setHapticPulse((state) => !state)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20"
                aria-pressed={hapticPulse}
              >
                <span className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/60">Haptic pulse</span>
                  <span className="text-white/70">Short wrist vibration when obstacles are close.</span>
                </span>
                <TogglePill active={hapticPulse} />
              </button>

              <button
                type="button"
                onClick={() => setPriorityAlerts((state) => !state)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20"
                aria-pressed={priorityAlerts}
              >
                <span className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/60">Priority alerts</span>
                  <span className="text-white/70">Pronounced cues for people and moving vehicles.</span>
                </span>
                <TogglePill active={priorityAlerts} />
              </button>

              <button
                type="button"
                onClick={() => setAutoCapture((state) => !state)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20"
                aria-pressed={autoCapture}
              >
                <span className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/60">Auto capture</span>
                  <span className="text-white/70">Store snapshots of important encounters.</span>
                </span>
                <TogglePill active={autoCapture} />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
          >
            <header>
              <h2 className="text-sm uppercase tracking-[0.35em] text-white/60">Routine reminders</h2>
              <p className="mt-1 text-xs text-white/40">Stay aligned with regular environment scans</p>
            </header>
            <div className="mt-5 space-y-3">
              {routineSlots.map((slot) => {
                const isEnabled = routineReminders.has(slot.id)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleRoutine(slot.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      isEnabled
                        ? 'border-sky-300 bg-sky-400/20 text-sky-100'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <span className="flex flex-col">
                      <span className="text-xs uppercase tracking-[0.3em]">{slot.label}</span>
                      <span className="text-sm tracking-[0.2em] text-white/50">{slot.time}</span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.35em]">
                      {isEnabled ? 'Active' : 'Off'}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Reminders sync with voice and haptic cues so you can revisit orientation whenever it suits your day.
            </p>
          </motion.div>
        </section>
      </main>

      <AppDock className="absolute bottom-8 left-1/2 -translate-x-1/2" />
    </div>
  )
}

function TogglePill({ active }) {
  return (
    <span
      className={`flex h-8 w-14 items-center rounded-full border px-1 transition ${
        active
          ? 'border-emerald-300 bg-emerald-400/20'
          : 'border-white/10 bg-white/5'
      }`}
      aria-hidden="true"
    >
      <span
        className={`h-6 w-6 rounded-full bg-white transition-transform ${
          active ? 'translate-x-6 shadow-[0_8px_20px_rgba(16,185,129,0.45)]' : 'translate-x-0'
        }`}
      />
    </span>
  )
}
