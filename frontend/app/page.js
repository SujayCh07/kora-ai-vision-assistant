'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Button from '@/components/Button'

export default function HomePage() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [wakeWordDetected, setWakeWordDetected] = useState(false)

  // Wake word detection (simulated)
  useEffect(() => {
    if (isListening) {
      const timeout = setTimeout(() => {
        setWakeWordDetected(true)
        setTimeout(() => {
          router.push('/live')
        }, 1000)
      }, 2000)

      return () => clearTimeout(timeout)
    }
  }, [isListening, router])

  const handleMicClick = () => {
    setIsListening(!isListening)
  }

  const handleStartSession = () => {
    router.push('/live')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Logo */}
          <div className="mb-8 animate-float">
            <div className="text-6xl font-bold bg-gradient-to-r from-kora-blue via-kora-cyan to-kora-accent bg-clip-text text-transparent mb-4">
              KORA
            </div>
            <div className="text-xl text-gray-400">
              AI Vision Assistant
            </div>
          </div>

          {/* Animated Microphone */}
          <div className="mb-12 flex justify-center">
            <button
              onClick={handleMicClick}
              className={`
                relative w-32 h-32 rounded-full
                flex items-center justify-center
                transition-all duration-300
                ${isListening
                  ? 'bg-kora-gradient shadow-kora-glow scale-110'
                  : 'bg-kora-panel border-2 border-kora-border hover:border-kora-blue'
                }
              `}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {/* Pulsing rings when listening */}
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-kora-blue opacity-20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-kora-cyan opacity-20 animate-ping animation-delay-150"></div>
                </>
              )}

              {/* Microphone icon */}
              <div className={`text-5xl z-10 ${isListening ? 'animate-pulse' : ''}`}>
                🎤
              </div>
            </button>
          </div>

          {/* Status text */}
          <div className="mb-8 h-12">
            {isListening ? (
              <div className="text-lg text-kora-cyan animate-pulse">
                {wakeWordDetected ? '✓ Wake word detected!' : 'Listening for "Hey Kora"...'}
              </div>
            ) : (
              <div className="text-gray-400">
                Tap the microphone or say "Hey Kora"
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartSession}
              className="w-full sm:w-auto"
            >
              Start Vision Session
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/help')}
              className="w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-lg">
              <div className="text-3xl mb-3">👁️</div>
              <div className="font-semibold mb-2">Real-time Vision</div>
              <div className="text-sm text-gray-400">
                Object detection and depth sensing
              </div>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <div className="text-3xl mb-3">🔊</div>
              <div className="font-semibold mb-2">Voice Guidance</div>
              <div className="text-sm text-gray-400">
                Natural voice instructions
              </div>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <div className="text-3xl mb-3">🎯</div>
              <div className="font-semibold mb-2">Spatial Awareness</div>
              <div className="text-sm text-gray-400">
                3D mapping and navigation
              </div>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="mt-12 text-sm text-gray-500">
            <kbd className="px-2 py-1 bg-kora-panel rounded border border-kora-border">Space</kbd>
            {' '}to start/stop session
            {' • '}
            <kbd className="px-2 py-1 bg-kora-panel rounded border border-kora-border">D</kbd>
            {' '}to describe surroundings
          </div>
        </div>
      </main>
    </div>
  )
}
