'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * CameraFeed component with canvas overlay for AR detection boxes
 */
export default function CameraFeed({
  onFrame,
  detections = [],
  isActive = true,
  className = ''
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const animationFrameRef = useRef(null)

  // Initialize camera
  useEffect(() => {
    if (!isActive) return

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          },
          audio: false
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
          setIsReady(true)
          setError(null)
        }
      } catch (err) {
        console.error('Camera error:', err)
        setError('Unable to access camera. Please grant camera permissions.')
      }
    }

    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive])

  // Draw overlay with detections
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video || !isReady) return

    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw AR-style grid - subtle and modern
    ctx.strokeStyle = 'rgba(0, 217, 163, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    const gridW = canvas.width / 3
    const gridH = canvas.height / 3

    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(gridW * i, 0)
      ctx.lineTo(gridW * i, canvas.height)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, gridH * i)
      ctx.lineTo(canvas.width, gridH * i)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Draw detections with modern AR style
    detections.forEach(detection => {
      const { bbox, label, confidence, distance } = detection

      if (!bbox || bbox.length !== 4) return

      const [x, y, w, h] = bbox

      // Determine color and style based on position
      const inCenter = isInCenter(x, y, w, h, canvas.width, canvas.height)
      const boxColor = inCenter ? '#00d9a3' : '#00b8ff' // Teal for center, blue for others
      const glowColor = inCenter ? 'rgba(0, 217, 163, 0.3)' : 'rgba(0, 184, 255, 0.2)'

      // Draw glow effect
      ctx.shadowColor = glowColor
      ctx.shadowBlur = 10

      // Draw corner brackets (AR style)
      ctx.strokeStyle = boxColor
      ctx.lineWidth = 3
      const cornerLength = Math.min(w, h) * 0.2

      // Top-left corner
      ctx.beginPath()
      ctx.moveTo(x, y + cornerLength)
      ctx.lineTo(x, y)
      ctx.lineTo(x + cornerLength, y)
      ctx.stroke()

      // Top-right corner
      ctx.beginPath()
      ctx.moveTo(x + w - cornerLength, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + cornerLength)
      ctx.stroke()

      // Bottom-left corner
      ctx.beginPath()
      ctx.moveTo(x, y + h - cornerLength)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x + cornerLength, y + h)
      ctx.stroke()

      // Bottom-right corner
      ctx.beginPath()
      ctx.moveTo(x + w - cornerLength, y + h)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x + w, y + h - cornerLength)
      ctx.stroke()

      // Reset shadow
      ctx.shadowBlur = 0

      // Draw label with modern styling
      const labelText = `${label}`
      ctx.font = '600 16px -apple-system, sans-serif'
      const textMetrics = ctx.measureText(labelText)
      const padding = 8
      const textHeight = 20

      // Label background with blur effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding)

      // Label text
      ctx.fillStyle = boxColor
      ctx.fillText(labelText, x + padding, y - padding - 2)

      // Draw distance badge if available
      if (distance) {
        const distText = `${distance.toFixed(1)}m`
        ctx.font = '600 14px -apple-system, sans-serif'
        const distMetrics = ctx.measureText(distText)

        // Distance badge
        const badgeY = y + h + 6
        const badgeHeight = 24
        const badgePadding = 10

        // Gradient background
        const gradient = ctx.createLinearGradient(x, badgeY, x, badgeY + badgeHeight)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)')

        ctx.fillStyle = gradient
        ctx.fillRect(x, badgeY, distMetrics.width + badgePadding * 2, badgeHeight)

        // Distance text
        ctx.fillStyle = boxColor
        ctx.fillText(distText, x + badgePadding, badgeY + 17)
      }
    })

    animationFrameRef.current = requestAnimationFrame(drawOverlay)
  }, [detections, isReady])

  // Helper function to check if object is in center
  function isInCenter(x, y, w, h, canvasW, canvasH) {
    const centerX = x + w / 2
    const centerY = y + h / 2
    const gridW = canvasW / 3
    const gridH = canvasH / 3

    return (
      centerX >= gridW && centerX <= gridW * 2 &&
      centerY >= gridH && centerY <= gridH * 2
    )
  }

  // Start drawing loop
  useEffect(() => {
    if (isReady) {
      drawOverlay()
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isReady, drawOverlay])

  // Capture and send frames periodically
  useEffect(() => {
    if (!isReady || !onFrame) return

    const interval = setInterval(() => {
      const canvas = canvasRef.current
      const video = videoRef.current

      if (canvas && video) {
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frameData = canvas.toDataURL('image/jpeg', 0.8)
        onFrame(frameData)
      }
    }, 100) // 10 FPS

    return () => clearInterval(interval)
  }, [isReady, onFrame])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <div className="text-center p-8 glass-panel rounded-2xl">
          <div className="text-kora-danger text-2xl mb-4 font-bold">Camera Error</div>
          <div className="text-kora-text text-lg">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center glass-panel px-8 py-10 rounded-2xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-kora-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-kora-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-kora-text text-xl font-medium">Initializing vision systems...</div>
          </div>
        </div>
      )}
    </div>
  )
}
