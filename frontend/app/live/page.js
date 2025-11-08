'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import CameraFeed from '@/components/CameraFeed'
import Button from '@/components/Button'
import { createSocket } from '@/lib/socket'
import { createVoiceEngine } from '@/lib/voice'

export default function LivePage() {
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [detections, setDetections] = useState([])
  const [caption, setCaption] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [stats, setStats] = useState({ fps: 0, objects: 0 })

  const socketRef = useRef(null)
  const voiceRef = useRef(null)
  const lastSpeechRef = useRef(0)

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
      console.log('Connected to Kora backend')
    })

    socketRef.current.on('close', () => {
      setConnectionStatus('disconnected')
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
      setStats({ fps: data.fps || 0, objects: formattedDetections.length })
    }

    // Update caption and speak
    if (data.message || data.direction) {
      const message = data.message || `${data.direction} - ${data.level}`
      setCaption(message)

      // Debounce speech (don't speak more than once per 2 seconds)
      const now = Date.now()
      if (now - lastSpeechRef.current > 2000) {
        lastSpeechRef.current = now
        voiceRef.current?.speak(message)
      }
    }
  }

  // Handle camera frames
  const handleFrame = (frameData) => {
    if (socketRef.current?.isConnected()) {
      socketRef.current.sendFrame(frameData)
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsActive(prev => !prev)
      } else if (e.code === 'KeyQ') {
        e.preventDefault()
        voiceRef.current?.setEnabled(!voiceRef.current.enabled)
      } else if (e.code === 'KeyD') {
        e.preventDefault()
        socketRef.current?.send({ type: 'describe' })
      } else if (e.code === 'Escape') {
        router.push('/')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [router])

  // Auto-start on mount
  useEffect(() => {
    setIsActive(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Status bar */}
          <div className="glass-panel p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm capitalize">{connectionStatus}</span>
              </div>
              <div className="text-sm text-gray-400">
                {stats.objects} objects • {stats.fps.toFixed(1)} FPS
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={isActive ? 'danger' : 'primary'}
                size="sm"
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? 'Stop' : 'Start'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/')}
              >
                Exit
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Camera feed */}
            <div className="lg:col-span-2">
              <CameraFeed
                isActive={isActive}
                detections={detections}
                onFrame={handleFrame}
                className="aspect-video rounded-lg overflow-hidden"
              />
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              {/* Caption display */}
              <div className="glass-panel p-6 rounded-lg min-h-[200px]">
                <div className="text-sm text-gray-400 mb-2">Live Caption</div>
                <div
                  className="text-lg font-medium"
                  role="status"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  {caption || 'Waiting for detections...'}
                </div>
                {voiceRef.current?.isCurrentlyPlaying() && (
                  <div className="mt-4 flex items-center space-x-2 text-kora-cyan">
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-kora-cyan animate-pulse"></div>
                      <div className="w-1 h-4 bg-kora-cyan animate-pulse animation-delay-100"></div>
                      <div className="w-1 h-4 bg-kora-cyan animate-pulse animation-delay-200"></div>
                    </div>
                    <span className="text-sm">Speaking...</span>
                  </div>
                )}
              </div>

              {/* Detection list */}
              <div className="glass-panel p-6 rounded-lg max-h-[400px] overflow-y-auto">
                <div className="text-sm text-gray-400 mb-4">Detected Objects</div>
                {detections.length === 0 ? (
                  <div className="text-gray-500 text-sm">No objects detected</div>
                ) : (
                  <div className="space-y-2">
                    {detections.map((det, idx) => (
                      <div
                        key={idx}
                        className="bg-kora-panel p-3 rounded border border-kora-border"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{det.label}</span>
                          <span className="text-sm text-gray-400">
                            {(det.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {det.distance && (
                          <div className="text-sm text-kora-cyan mt-1">
                            {det.distance.toFixed(1)}m away
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls hint */}
              <div className="glass-panel p-4 rounded-lg text-xs text-gray-400 space-y-1">
                <div><kbd className="px-1 py-0.5 bg-kora-panel rounded">Space</kbd> Toggle session</div>
                <div><kbd className="px-1 py-0.5 bg-kora-panel rounded">D</kbd> Describe scene</div>
                <div><kbd className="px-1 py-0.5 bg-kora-panel rounded">Q</kbd> Quiet mode</div>
                <div><kbd className="px-1 py-0.5 bg-kora-panel rounded">Esc</kbd> Exit</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
