'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    voiceVolume: 80,
    sensitivity: 'medium',
    environmentMode: 'indoor',
  })

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kora-settings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }

    // Announce page
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Settings. Swipe to adjust options.")
      utterance.rate = 0.9
      setTimeout(() => window.speechSynthesis.speak(utterance), 500)
    }
  }, [])

  // Save settings to localStorage
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('kora-settings', JSON.stringify(newSettings))

    // Voice feedback
    if ('speechSynthesis' in window) {
      const messages = {
        voiceEnabled: value ? "Voice enabled" : "Voice disabled",
        voiceVolume: `Volume ${value} percent`,
        sensitivity: `Sensitivity ${value}`,
        environmentMode: `Environment mode ${value}`,
      }
      const utterance = new SpeechSynthesisUtterance(messages[key])
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleBack = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Going back")
      window.speechSynthesis.speak(utterance)
    }
    router.back()
  }

  const resetSettings = () => {
    const defaults = {
      voiceEnabled: true,
      voiceVolume: 80,
      sensitivity: 'medium',
      environmentMode: 'indoor',
    }
    setSettings(defaults)
    localStorage.setItem('kora-settings', JSON.stringify(defaults))

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Settings reset to defaults")
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="min-h-screen bg-kora-dark p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">Settings</h1>
        <button
          onClick={handleBack}
          className="w-14 h-14 rounded-full bg-kora-panel border-2 border-kora-border text-white flex items-center justify-center"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Voice Toggle */}
        <div className="panel p-6">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-white mb-2">Voice Guidance</div>
              <div className="text-lg text-gray-400">Enable voice instructions</div>
            </div>
            <button
              onClick={() => updateSetting('voiceEnabled', !settings.voiceEnabled)}
              className={`
                w-20 h-12 rounded-full transition-colors relative
                ${settings.voiceEnabled ? 'bg-kora-primary' : 'bg-gray-600'}
              `}
              role="switch"
              aria-checked={settings.voiceEnabled}
              aria-label="Toggle voice guidance"
            >
              <div className={`
                absolute top-1 w-10 h-10 rounded-full bg-white transition-transform
                ${settings.voiceEnabled ? 'right-1' : 'left-1'}
              `}></div>
            </button>
          </label>
        </div>

        {/* Volume Slider */}
        <div className="panel p-6">
          <label>
            <div className="text-2xl font-semibold text-white mb-2">
              Volume
            </div>
            <div className="text-lg text-gray-400 mb-4">{settings.voiceVolume}%</div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={settings.voiceVolume}
              onChange={(e) => updateSetting('voiceVolume', parseInt(e.target.value))}
              className="w-full h-4 bg-kora-panel rounded-full appearance-none cursor-pointer accent-kora-primary"
              style={{
                WebkitAppearance: 'none',
                height: '16px',
                borderRadius: '8px',
              }}
              aria-label="Adjust voice volume"
            />
          </label>
        </div>

        {/* Sensitivity */}
        <div className="panel p-6">
          <label>
            <div className="text-2xl font-semibold text-white mb-4">Sensitivity</div>
            <select
              value={settings.sensitivity}
              onChange={(e) => updateSetting('sensitivity', e.target.value)}
              className="w-full bg-kora-bg border-2 border-kora-border text-white text-xl p-4 rounded-lg"
              aria-label="Select detection sensitivity"
            >
              <option value="low">Low - Fewer alerts</option>
              <option value="medium">Medium - Balanced</option>
              <option value="high">High - Maximum awareness</option>
            </select>
          </label>
        </div>

        {/* Environment Mode */}
        <div className="panel p-6">
          <label>
            <div className="text-2xl font-semibold text-white mb-4">Environment</div>
            <select
              value={settings.environmentMode}
              onChange={(e) => updateSetting('environmentMode', e.target.value)}
              className="w-full bg-kora-bg border-2 border-kora-border text-white text-xl p-4 rounded-lg"
              aria-label="Select environment mode"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </label>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetSettings}
          className="w-full bg-kora-danger text-white text-xl font-semibold p-6 rounded-lg"
          aria-label="Reset all settings to defaults"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
