'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Button from '@/components/Button'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    voiceVolume: 80,
    sensitivity: 'medium',
    motionDetection: true,
    depthEstimation: true,
    developerMode: false,
    environmentMode: 'indoor',
    speechRate: 'normal',
    contrastMode: false,
  })

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kora-settings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  // Save settings to localStorage
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('kora-settings', JSON.stringify(newSettings))
  }

  const resetSettings = () => {
    const defaults = {
      voiceEnabled: true,
      voiceVolume: 80,
      sensitivity: 'medium',
      motionDetection: true,
      depthEstimation: true,
      developerMode: false,
      environmentMode: 'indoor',
      speechRate: 'normal',
      contrastMode: false,
    }
    setSettings(defaults)
    localStorage.setItem('kora-settings', JSON.stringify(defaults))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400">Customize your Kora experience</p>
          </div>

          <div className="space-y-6">
            {/* Voice Settings */}
            <section className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">🔊</span>
                Voice & Audio
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Voice Guidance</div>
                    <div className="text-sm text-gray-400">Enable voice instructions</div>
                  </div>
                  <button
                    onClick={() => updateSetting('voiceEnabled', !settings.voiceEnabled)}
                    className={`
                      relative w-14 h-7 rounded-full transition-colors
                      ${settings.voiceEnabled ? 'bg-kora-blue' : 'bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={settings.voiceEnabled}
                  >
                    <div className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                      ${settings.voiceEnabled ? 'translate-x-7' : ''}
                    `}></div>
                  </button>
                </div>

                <div>
                  <label className="block mb-2">
                    <span className="font-medium">Volume</span>
                    <span className="text-sm text-gray-400 ml-2">{settings.voiceVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.voiceVolume}
                    onChange={(e) => updateSetting('voiceVolume', parseInt(e.target.value))}
                    className="w-full accent-kora-blue"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">Speech Rate</label>
                  <select
                    value={settings.speechRate}
                    onChange={(e) => updateSetting('speechRate', e.target.value)}
                    className="w-full bg-kora-panel border border-kora-border rounded-lg px-4 py-2 text-white focus:border-kora-blue focus:outline-none"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Detection Settings */}
            <section className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">👁️</span>
                Vision & Detection
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">Sensitivity</label>
                  <select
                    value={settings.sensitivity}
                    onChange={(e) => updateSetting('sensitivity', e.target.value)}
                    className="w-full bg-kora-panel border border-kora-border rounded-lg px-4 py-2 text-white focus:border-kora-blue focus:outline-none"
                  >
                    <option value="low">Low - Fewer alerts</option>
                    <option value="medium">Medium - Balanced</option>
                    <option value="high">High - Maximum awareness</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 font-medium">Environment Mode</label>
                  <select
                    value={settings.environmentMode}
                    onChange={(e) => updateSetting('environmentMode', e.target.value)}
                    className="w-full bg-kora-panel border border-kora-border rounded-lg px-4 py-2 text-white focus:border-kora-blue focus:outline-none"
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Motion Detection</div>
                    <div className="text-sm text-gray-400">Alert on moving objects</div>
                  </div>
                  <button
                    onClick={() => updateSetting('motionDetection', !settings.motionDetection)}
                    className={`
                      relative w-14 h-7 rounded-full transition-colors
                      ${settings.motionDetection ? 'bg-kora-blue' : 'bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={settings.motionDetection}
                  >
                    <div className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                      ${settings.motionDetection ? 'translate-x-7' : ''}
                    `}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Depth Estimation</div>
                    <div className="text-sm text-gray-400">Calculate distance to objects</div>
                  </div>
                  <button
                    onClick={() => updateSetting('depthEstimation', !settings.depthEstimation)}
                    className={`
                      relative w-14 h-7 rounded-full transition-colors
                      ${settings.depthEstimation ? 'bg-kora-blue' : 'bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={settings.depthEstimation}
                  >
                    <div className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                      ${settings.depthEstimation ? 'translate-x-7' : ''}
                    `}></div>
                  </button>
                </div>
              </div>
            </section>

            {/* Accessibility Settings */}
            <section className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">♿</span>
                Accessibility
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">High Contrast Mode</div>
                    <div className="text-sm text-gray-400">Enhanced visual contrast</div>
                  </div>
                  <button
                    onClick={() => updateSetting('contrastMode', !settings.contrastMode)}
                    className={`
                      relative w-14 h-7 rounded-full transition-colors
                      ${settings.contrastMode ? 'bg-kora-blue' : 'bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={settings.contrastMode}
                  >
                    <div className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                      ${settings.contrastMode ? 'translate-x-7' : ''}
                    `}></div>
                  </button>
                </div>
              </div>
            </section>

            {/* Advanced Settings */}
            <section className="glass-panel p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">⚙️</span>
                Advanced
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Developer Mode</div>
                    <div className="text-sm text-gray-400">Show debug information</div>
                  </div>
                  <button
                    onClick={() => updateSetting('developerMode', !settings.developerMode)}
                    className={`
                      relative w-14 h-7 rounded-full transition-colors
                      ${settings.developerMode ? 'bg-kora-blue' : 'bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={settings.developerMode}
                  >
                    <div className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                      ${settings.developerMode ? 'translate-x-7' : ''}
                    `}></div>
                  </button>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="danger"
                onClick={resetSettings}
              >
                Reset to Defaults
              </Button>
              <div className="text-sm text-gray-400">
                Settings are saved automatically
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
