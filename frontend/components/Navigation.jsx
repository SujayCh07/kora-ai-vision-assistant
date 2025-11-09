'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/camera',
    label: 'Camera',
    sublabel: 'AR view',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <rect x="3" y="5" width="18" height="14" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    href: '/people',
    label: 'People',
    sublabel: 'Face memory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M16 11a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M8 11a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M3 20v-1a5 5 0 015-5h1" />
        <path d="M21 20v-1a5 5 0 00-5-5h-1" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    sublabel: 'Preferences',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 008.6 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    href: '/live',
    label: 'Live',
    sublabel: 'Pilot feed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
]

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/camera', label: 'Camera', icon: '📷' },
    { href: '/live', label: 'Live', icon: '📹' },
    { href: '/people', label: 'People', icon: '👥' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
    { href: '/help', label: 'Help', icon: '❓' },
  ]

  return (
    <nav className="pointer-events-none fixed left-0 right-0 top-0 z-[100]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-3xl sm:px-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/40 to-violet-500/40 text-white">
              <span className="text-lg font-semibold tracking-[0.4em]">K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">Vision Suite</span>
              <span className="text-sm font-semibold tracking-[0.2em] text-white">Kora</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center gap-2 overflow-x-auto px-2 sm:justify-center">
            {navItems.map((item) => {
              const isActive = normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex min-w-[4.5rem] flex-col items-center rounded-2xl px-3 py-2 text-xs uppercase tracking-[0.25em] transition-colors ${
                    isActive
                      ? 'bg-gradient-to-br from-teal-400/30 via-sky-500/30 to-indigo-500/30 text-white shadow-[0_10px_35px_rgba(56,189,248,0.35)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`mb-1 flex h-8 w-8 items-center justify-center rounded-xl border ${
                    isActive ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5 group-hover:border-white/30'
                  }`}>
                    <span className="text-white/80">{item.icon}</span>
                  </span>
                  <span className="text-[0.6rem] font-semibold leading-tight">{item.label}</span>
                  <span className="text-[0.55rem] tracking-[0.35em] text-white/40">{item.sublabel}</span>
                </Link>
              )
            })}
          </div>

        <div className="flex space-x-1">
          {navItems.map(item => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-4 py-2 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-kora-gradient text-white shadow-kora-glow'
                    : 'text-gray-400 hover:text-white hover:bg-kora-panel'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="mr-2">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
