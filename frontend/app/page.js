'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  // Auto-announce page on load
  useEffect(() => {
    const announcement = "Kora Vision Assistant. Tap the screen to start camera."
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(announcement)
      utterance.rate = 0.9
      utterance.volume = 1.0
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
        setIsReady(true)
      }, 500)
    } else {
      setIsReady(true)
    }
  }, [])

  const handleStart = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Starting camera")
      window.speechSynthesis.speak(utterance)
    }
    setTimeout(() => {
      router.push('/live')
    }, 300)
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
    <div
      className="min-h-screen bg-kora-dark flex flex-col items-center justify-center p-6 touch-manipulation"
      onClick={handleStart}
      role="button"
      tabIndex={0}
      aria-label="Start Kora Vision Assistant. Tap anywhere to begin."
    >
      <div className="text-center max-w-md w-full pointer-events-none">
        <h1
          className="text-7xl font-bold text-kora-primary mb-6"
          aria-label="Kora"
        >
          KORA
        </h1>

        <p className="text-3xl text-white mb-16 font-light" aria-live="polite">
          Vision Assistant
        </p>

        <div className="mb-16">
          <div className="w-40 h-40 mx-auto rounded-full border-8 border-kora-primary flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-kora-primary"></div>
          </div>
        </div>

        <p className="text-2xl text-gray-300 font-medium">
          Tap to Start
        </p>
      </div>

      {/* Settings button in bottom corner */}
      <button
        onClick={handleSettings}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-kora-panel border-2 border-kora-border text-white flex items-center justify-center pointer-events-auto"
        aria-label="Open settings"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}
