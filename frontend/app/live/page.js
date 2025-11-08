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
  const [caption, setCaption] = useState('Starting camera...')
  const [connectionStatus, setConnectionStatus] = useState('connecting')

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
      setCaption('Camera active. Scanning surroundings.')
      if (!hasAnnouncedRef.current) {
        voiceRef.current?.speak('Camera active. Scanning surroundings.')
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

    // Announce instructions
    setTimeout(() => {
      if (!hasAnnouncedRef.current) {
        voiceRef.current?.speak('Tap bottom left to exit. Tap bottom right for settings.')
        hasAnnouncedRef.current = true
      }
    }, 2000)

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
        voiceRef.current?.speak(data.message)
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
    voiceRef.current?.speak('Exiting camera')
    setTimeout(() => router.push('/'), 300)
  }

  const handleSettings = () => {
    voiceRef.current?.speak('Opening settings')
    setTimeout(() => router.push('/settings'), 300)
  }

  return (
    <div className="fixed inset-0 bg-kora-dark overflow-hidden">
      {/* Full-screen camera */}
      <CameraFeed
        isActive={isActive}
        detections={detections}
        onFrame={handleFrame}
        className="absolute inset-0 w-full h-full"
      />

      {/* Caption bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-6 safe-area-inset-bottom">
        <div
          className="text-center text-2xl font-medium text-white"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          {caption}
        </div>
      </div>

      {/* Exit button - bottom left */}
      <button
        onClick={handleExit}
        className="fixed bottom-24 left-6 w-20 h-20 rounded-full bg-kora-danger border-4 border-white text-white flex items-center justify-center shadow-2xl safe-area-inset-bottom"
        aria-label="Exit camera and return home"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Settings button - bottom right */}
      <button
        onClick={handleSettings}
        className="fixed bottom-24 right-6 w-20 h-20 rounded-full bg-kora-panel border-4 border-white text-white flex items-center justify-center shadow-2xl safe-area-inset-bottom"
        aria-label="Open settings"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Connection status indicator - top left */}
      <div className="fixed top-6 left-6 flex items-center space-x-3 bg-black/60 backdrop-blur-sm px-4 py-3 rounded-full">
        <div className={`w-4 h-4 rounded-full ${
          connectionStatus === 'connected' ? 'bg-kora-primary' :
          connectionStatus === 'error' ? 'bg-kora-danger' :
          'bg-kora-warning'
        }`}></div>
        <span className="text-white text-sm font-medium capitalize sr-only">
          {connectionStatus}
        </span>
      </div>
    </div>
  )
}
