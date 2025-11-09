'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  {
    label: 'Camera',
    path: '/camera',
    icon: (active) => (
      <svg
        className={`h-6 w-6 ${active ? 'text-white' : 'text-white/70'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <circle
          cx="12"
          cy="12"
          r="3.5"
          fill="currentColor"
          className={active ? 'text-white' : 'text-transparent'}
        />
      </svg>
    ),
  },
  {
    label: 'People',
    path: '/people',
    icon: (active) => (
      <svg
        className={`h-6 w-6 ${active ? 'text-white' : 'text-white/70'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 11a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M8 11a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M3 20v-1a5 5 0 015-5h1" />
        <path d="M21 20v-1a5 5 0 00-5-5h-1" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (active) => (
      <svg
        className={`h-6 w-6 ${active ? 'text-white' : 'text-white/70'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 008.6 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function AppDock({ className = '', showMic = false, onMicPress }) {
  const router = useRouter()
  const pathname = usePathname()

  const currentPath = useMemo(() => pathname ?? '/camera', [pathname])

  return (
    <div className={`pointer-events-auto flex flex-col items-center gap-5 ${className}`}>
      {showMic && (
        <motion.button
          onClick={onMicPress}
          whileTap={{ scale: 0.92 }}
          animate={{ boxShadow: ['0 0 0 0 rgba(56,189,248,0.35)', '0 0 0 20px rgba(45,212,191,0)'] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 via-sky-500 to-indigo-500 text-white shadow-[0_15px_35px_rgba(56,189,248,0.35)]"
          aria-label="Activate microphone"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 00-3 3v6a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10a7 7 0 01-14 0" />
              <path d="M12 17v4" />
              <path d="M8 21h8" />
            </svg>
          </span>
        </motion.button>
      )}

      <div className="flex w-[85vw] max-w-xl items-center justify-around rounded-3xl border border-white/15 bg-white/15 px-6 py-4 backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = currentPath === item.path
          return (
            <motion.button
              key={item.path}
              onClick={() => router.push(item.path)}
              whileTap={{ scale: 0.94 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              aria-label={item.label}
            >
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.05 : 1 }}
                className={`flex h-full w-full items-center justify-center rounded-2xl ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-400/70 via-sky-500/70 to-indigo-500/70 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]'
                    : ''
                }`}
              >
                {item.icon(isActive)}
              </motion.div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
