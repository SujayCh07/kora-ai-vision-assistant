'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CameraFeed from '@/components/CameraFeed'
import { createSocket } from '@/lib/socket'
import { createVoiceEngine } from '@/lib/voice'

export default function LivePage() {
  const router = useRouter()
  const [isActive, setIsActive] = useState(true)
  const [detections, setDetections] = useState([])
  const [caption, setCaption] = useState('Initializing vision systems...')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [isSpeaking, setIsSpeaking] = useState(false)

  const socketRef = useRef(null)
  const voiceRef = useRef(null)
  const lastSpeechRef = useRef(0)
  const hasAnnouncedRef = useRef(false)

  // Initialize WebSocket and Voice
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
    const apiKey = process.env.NEXT_PUBLIC_ELEVEN_API_KEY

    socketRef.current = createSocket(wsUrl, {
      maxReconnectAttempts: 10,
      reconnectDelay: 2000
    })

    voiceRef.current = createVoiceEngine(apiKey)

    // Socket event handlers
    socketRef.current.on('open', () => {
      setConnectionStatus('connected')
      setCaption('Vision system active')
      if (!hasAnnouncedRef.current) {
        voiceRef.current?.speak('Vision system active. Scanning environment.')
        hasAnnouncedRef.current = true
      }
    })

    socketRef.current.on('close', () => {
      setConnectionStatus('disconnected')
      setCaption('Connection lost. Reconnecting...')
    })

    socketRef.current.on('error', (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('error')
    })

    socketRef.current.on('detection', handleDetection)

    socketRef.current.connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      if (voiceRef.current) {
        voiceRef.current.stop()
      }
    }
  }, [])

  // Handle detection from backend
  const handleDetection = (data) => {
    // Update detections
    if (data.objects) {
      const formattedDetections = data.objects.map(obj => ({
        bbox: obj.bbox,
        label: obj.label || obj.class,
        confidence: obj.confidence || 0,
        distance: obj.distance,
        color: obj.color
      }))
      setDetections(formattedDetections)
    }

    // Update caption and speak
    if (data.message) {
      setCaption(data.message)

      // Debounce speech (don't speak more than once per 3 seconds)
      const now = Date.now()
      if (now - lastSpeechRef.current > 3000) {
        lastSpeechRef.current = now
        setIsSpeaking(true)
        voiceRef.current?.speak(data.message)
        setTimeout(() => setIsSpeaking(false), 2000)
      }
    }
  }

  // Handle camera frames
  const handleFrame = (frameData) => {
    if (socketRef.current?.isConnected()) {
      socketRef.current.sendFrame(frameData)
    }
  }

  const handleExit = () => {
    voiceRef.current?.speak('Deactivating')
    setTimeout(() => router.push('/'), 300)
  }

  const handleSettings = () => {
    voiceRef.current?.speak('Opening settings')
    setTimeout(() => router.push('/settings'), 300)
  }

  const handleDescribe = () => {
    voiceRef.current?.speak('Analyzing environment')
    socketRef.current?.send({ type: 'describe' })
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Full-screen camera */}
      <CameraFeed
        isActive={isActive}
        detections={detections}
        onFrame={handleFrame}
        className="absolute inset-0 w-full h-full"
      />

      {/* AR overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none"></div>

      {/* Top status bar - frosted glass */}
      <div className="absolute top-0 left-0 right-0 safe-area-inset-top">
        <div className="frosted border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Connection status */}
            <div className="flex items-center space-x-3">
              <div className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-kora-success animate-pulse' :
                connectionStatus === 'error' ? 'bg-kora-danger' :
                'bg-kora-warning animate-pulse'
              }`}></div>
              <span className="text-sm font-medium text-white/90 capitalize">
                {connectionStatus}
              </span>
            </div>

            {/* Environment mode badge */}
            <div className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
              <span className="text-sm font-medium text-white">Indoor Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice pulse visualization */}
      {isSpeaking && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 animate-fade-in">
          <div className="flex items-center space-x-2 px-6 py-3 rounded-full glass-panel">
            <div className="flex space-x-1.5">
              <div className="w-1 h-8 bg-kora-primary rounded-full animate-pulse"></div>
              <div className="w-1 h-6 bg-kora-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-10 bg-kora-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-7 bg-kora-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-1 h-9 bg-kora-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-sm font-medium text-kora-text ml-2">Speaking...</span>
          </div>
        </div>
      )}

      {/* Caption bar - floating at bottom */}
      <div className="absolute bottom-24 left-0 right-0 px-6 safe-area-inset-bottom">
        <div className="glass-panel px-6 py-5 rounded-2xl animate-slide-up">
          <div
            className="text-center text-xl font-semibold text-kora-text"
            role="status"
            aria-live="assertive"
            aria-atomic="true"
          >
            {caption}
          </div>
        </div>
      </div>

      {/* Floating bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 px-6 safe-area-inset-bottom">
        <div className="frosted border border-white/20 rounded-3xl px-6 py-4 shadow-kora-xl">
          <div className="flex items-center justify-between">
            {/* Exit button */}
            <button
              onClick={handleExit}
              className="flex flex-col items-center space-y-2 group"
              aria-label="Exit and return home"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kora-danger to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="text-xs font-medium text-white/80">Exit</span>
            </button>

            {/* Describe button - center */}
            <button
              onClick={handleDescribe}
              className="flex flex-col items-center space-y-2 group"
              aria-label="Describe surroundings"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kora-primary to-kora-secondary flex items-center justify-center shadow-lg group-hover:shadow-kora-glow transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-white/80">Describe</span>
            </button>

            {/* Settings button */}
            <button
              onClick={handleSettings}
              className="flex flex-col items-center space-y-2 group"
              aria-label="Open settings"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-white/80">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
