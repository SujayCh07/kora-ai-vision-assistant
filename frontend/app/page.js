'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)

  // Auto-announce page on load
  useEffect(() => {
    const announcement = "Kora Vision Assistant. Tap anywhere to start."
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(announcement)
      utterance.rate = 0.9
      utterance.volume = 1.0
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 500)
    }
  }, [])

  const handleStart = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Activating vision system")
      window.speechSynthesis.speak(utterance)
    }
    setIsListening(true)
    setTimeout(() => {
      router.push('/live')
    }, 600)
  }

  const handleSettings = (e) => {
    e.stopPropagation()
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Opening settings")
      window.speechSynthesis.speak(utterance)
    }
    router.push('/settings')
  }

  return (
    <div className="min-h-screen bg-kora-mesh relative overflow-hidden">
      {/* Abstract AR background elements */}
      <div className="absolute inset-0 bg-kora-gradient-ar"></div>

      {/* Floating ambient circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-kora-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-kora-secondary/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

      {/* Main content */}
      <div
        className="relative min-h-screen flex flex-col items-center justify-center p-6"
        onClick={handleStart}
        role="button"
        tabIndex={0}
        aria-label="Start Kora Vision Assistant. Tap anywhere to begin."
      >
        {/* Logo and title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-kora-primary to-kora-secondary rounded-3xl shadow-kora-xl mb-6">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>

          <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-kora-primary via-kora-secondary to-kora-accent bg-clip-text text-transparent">
            KORA
          </h1>
          <p className="text-2xl text-kora-text-secondary font-medium">
            Your AI Vision Assistant
          </p>
        </div>

        {/* Pulsing mic button */}
        <div className="mb-16 animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="relative">
            {/* Outer pulsing rings */}
            {isPulsing && (
              <>
                <div className="absolute inset-0 w-48 h-48 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
                  <div className="absolute inset-0 bg-kora-primary/20 rounded-full animate-pulse-ring"></div>
                </div>
                <div className="absolute inset-0 w-56 h-56 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
                  <div className="absolute inset-0 bg-kora-secondary/15 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </>
            )}

            {/* Main mic button */}
            <button
              onClick={handleStart}
              className={`
                relative w-40 h-40 rounded-full
                bg-gradient-to-br from-kora-primary to-kora-secondary
                shadow-kora-xl hover:shadow-kora-glow
                flex items-center justify-center
                transform transition-all duration-300
                ${isListening ? 'scale-95' : 'hover:scale-105'}
              `}
              aria-label="Tap to start vision session"
            >
              {/* Glass overlay */}
              <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm"></div>

              {/* Mic icon */}
              <svg className="w-16 h-16 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
          <p className="text-xl text-kora-text-secondary mb-8 font-medium">
            Tap to Start
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="floating-card p-4 text-center">
              <div className="text-3xl mb-2">👁️</div>
              <div className="text-sm text-kora-text-secondary font-medium">Real-time Vision</div>
            </div>
            <div className="floating-card p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-sm text-kora-text-secondary font-medium">AR Guidance</div>
            </div>
            <div className="floating-card p-4 text-center">
              <div className="text-3xl mb-2">🔊</div>
              <div className="text-sm text-kora-text-secondary font-medium">Voice Feedback</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings button - floating bottom right */}
      <button
        onClick={handleSettings}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl glass-panel flex items-center justify-center hover:shadow-kora-glow transition-all"
        aria-label="Open settings"
      >
        <svg className="w-7 h-7 text-kora-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}
