'use client'

/**
 * Loading screen with Kora branding
 */
export default function LoadingScreen({ message = "Initializing vision systems..." }) {
  return (
    <div className="fixed inset-0 bg-kora-dark flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated logo */}
        <div className="mb-8 animate-float">
          <div className="text-6xl font-bold bg-gradient-to-r from-kora-blue via-kora-cyan to-kora-accent bg-clip-text text-transparent">
            KORA
          </div>
        </div>

        {/* Pulsing circles */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-kora-blue opacity-20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-kora-cyan opacity-20 animate-ping animation-delay-150"></div>
          <div className="absolute inset-0 rounded-full bg-kora-accent opacity-20 animate-ping animation-delay-300"></div>
          <div className="absolute inset-0 rounded-full bg-kora-gradient flex items-center justify-center">
            <div className="text-2xl">👁️</div>
          </div>
        </div>

        {/* Loading message */}
        <div className="text-lg text-gray-400 animate-pulse">
          {message}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center mt-4 space-x-2">
          <div className="w-2 h-2 rounded-full bg-kora-blue animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-kora-cyan animate-bounce animation-delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-kora-accent animate-bounce animation-delay-200"></div>
        </div>
      </div>
    </div>
  )
}
