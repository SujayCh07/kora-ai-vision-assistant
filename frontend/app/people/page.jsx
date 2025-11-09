'use client'

import { motion } from 'framer-motion'
import AppDock from '@/components/AppDock'

const recognizablePeople = [
  {
    name: 'Mom',
    relation: 'Priority contact',
    lastSeen: 'Today · 9:42 AM · Kitchen',
    confidence: 98,
    cues: ['Warm greeting', 'Distance alert < 2m'],
    notes: 'Prefers guidance to announce doorways and table edges first.',
  },
  {
    name: 'Friend',
    relation: 'Everyday companion',
    lastSeen: 'Yesterday · 6:18 PM · City sidewalk',
    confidence: 94,
    cues: ['Friendly chime', 'Tone only at night'],
    notes: 'Enable proximity reminders during commutes together.',
  },
  {
    name: 'Neighbor',
    relation: 'Community support',
    lastSeen: '2 days ago · Lobby entrance',
    confidence: 87,
    cues: ['Neutral alert', 'Share update card'],
    notes: 'Often carries packages—highlight large objects in arms.',
  },
]

export default function PeoplePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute left-1/5 top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-40 pt-32 sm:px-10 lg:px-16">
        <header className="flex flex-col gap-2 text-left">
          <span className="text-xs uppercase tracking-[0.4em] text-white/60">Face memory</span>
          <h1 className="text-3xl font-semibold tracking-[0.25em] sm:text-4xl">Recognizable people</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/60">
            Review how Kora identifies the people you trust most. Confidence scores, last sightings, and cue preferences keep recognition transparent and easy to tune.
          </p>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {recognizablePeople.map((person, index) => (
            <motion.article
              key={person.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
            >
              <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-gradient-to-br from-teal-400/30 to-indigo-500/40 blur-2xl transition-opacity group-hover:opacity-100" aria-hidden="true" />

              <div className="relative flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white/80">
                      {person.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm uppercase tracking-[0.35em] text-white/60">{person.relation}</span>
                      <h2 className="text-xl font-medium tracking-[0.2em] text-white">{person.name}</h2>
                    </div>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.35em] text-white/50">
                    <span className="text-base font-semibold text-teal-200">{person.confidence}%</span>
                    <p>Confidence</p>
                  </div>
                </div>

                <dl className="space-y-3 text-sm text-white/70">
                  <div>
                    <dt className="text-[0.6rem] uppercase tracking-[0.35em] text-white/50">Last seen</dt>
                    <dd className="mt-1 text-white/80">{person.lastSeen}</dd>
                  </div>

                  <div>
                    <dt className="text-[0.6rem] uppercase tracking-[0.35em] text-white/50">Preferred cues</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {person.cues.map((cue) => (
                        <span
                          key={cue}
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/70"
                        >
                          {cue}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>

                <p className="text-sm leading-relaxed text-white/60">{person.notes}</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
                <button type="button" className="text-white/80 transition hover:text-white">
                  Prioritize
                </button>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <button type="button" className="text-white/80 transition hover:text-white">
                  Edit cues
                </button>
              </div>
            </motion.article>
          ))}
        </motion.section>
      </main>

      <AppDock className="absolute bottom-8 left-1/2 -translate-x-1/2" />
    </div>
  )
}
