'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AppDock from '@/components/AppDock'

export default function CameraPage() {
  const videoRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    let activeStream

    const enableStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        activeStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraError(null)
      } catch (error) {
        setCameraError('Unable to access camera. Please check permissions.')
      }
    }

    enableStream()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      <div className="absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1.8 }}
          className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-teal-400/40 via-sky-500/30 to-violet-500/40 blur-3xl"
        />
      </div>

      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6 text-sm">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.35em] text-white/70">Vision Assistant</span>
          <span className="text-2xl font-semibold tracking-[0.25em] text-white">Kora</span>
        </motion.div>
        <div className="flex items-center gap-4 text-white/80">
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em]">Signal</span>
            <div className="flex h-3 w-12 items-end gap-[2px]">
              <span className="h-1 w-1.5 rounded-sm bg-white/40" />
              <span className="h-2 w-1.5 rounded-sm bg-white/50" />
              <span className="h-2.5 w-1.5 rounded-sm bg-white/70" />
              <span className="h-3 w-1.5 rounded-sm bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em]">Power</span>
            <div className="flex h-3 w-10 items-center rounded-sm border border-white/40 p-[2px]">
              <div className="h-full flex-1 rounded-[2px] bg-gradient-to-r from-lime-300 to-emerald-400" />
            </div>
          </div>
        </div>
      </header>

      {cameraError && (
        <div className="absolute top-24 rounded-full bg-black/60 px-5 py-2 text-sm tracking-wide text-white/90 backdrop-blur-md">
          {cameraError}
        </div>
      )}

      <AppDock
        showMic
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        onMicPress={() => {
          // Placeholder for microphone activation logic
        }}
      />
    </div>
  )
}
