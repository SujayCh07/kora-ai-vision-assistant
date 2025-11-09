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

      {cameraError && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2 text-sm tracking-wide text-white/90 backdrop-blur-md">
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
