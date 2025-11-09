'use client'

import { motion } from 'framer-motion'
import AppDock from '@/components/AppDock'

const recognizablePeople = [
  { name: 'Mom', relation: 'Priority Contact' },
  { name: 'Friend', relation: 'Everyday Companion' },
  { name: 'Neighbor', relation: 'Community' },
]

export default function PeoplePage() {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute left-1/4 top-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Face Memory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.25em]">Recognizable People</h1>
        </div>
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60"
        >
          Preview
        </motion.span>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex-1 overflow-y-auto px-6 pb-36"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recognizablePeople.map((person, index) => (
            <motion.div
              key={person.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <div className="absolute right-4 top-4 h-12 w-12 rounded-full bg-gradient-to-br from-teal-400/30 to-indigo-500/40 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex flex-col items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold text-white/70">
                  {person.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-medium tracking-[0.2em] text-white">{person.name}</h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">{person.relation}</p>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  Stored face encoding ready for instant recognition. Tap to manage preferences once live detection is connected.
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <AppDock className="absolute bottom-8 left-1/2 -translate-x-1/2" />
    </div>
  )
}
