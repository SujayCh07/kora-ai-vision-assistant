'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function LoadingScreen() {
  const router = useRouter()

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/camera')
    }, 2000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-white text-slate-900">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.1em' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-7xl font-bold uppercase tracking-[0.1em] text-transparent bg-gradient-to-r from-teal-400 via-blue-500 to-violet-500 bg-clip-text"
        >
          KORA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
          className="mt-6 text-lg font-medium tracking-wide text-slate-500"
        >
          Initializing Vision System...
        </motion.p>

        <div className="relative mt-4 h-1 w-64 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-teal-400/70 to-transparent"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.25, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-100/20 via-transparent to-violet-100/20"
      />
    </div>
  )
}
