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

    // Draw 3x3 grid - subtle
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)'
    ctx.lineWidth = 2
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

    // Draw detections
    detections.forEach(detection => {
      const { bbox, label, confidence, distance } = detection

      if (!bbox || bbox.length !== 4) return

      const [x, y, w, h] = bbox

      // Determine color based on position
      const inCenter = isInCenter(x, y, w, h, canvas.width, canvas.height)
      const boxColor = inCenter ? '#ffaa00' : '#00ff00' // Warning for center, green for others
      const boxAlpha = inCenter ? '0.9' : '0.7'

      // Draw bounding box with thicker line
      ctx.strokeStyle = boxColor
      ctx.lineWidth = 4
      ctx.strokeRect(x, y, w, h)

      // Draw label with better visibility
      const labelText = `${label}`
      ctx.font = 'bold 20px sans-serif'
      const textMetrics = ctx.measureText(labelText)
      const textHeight = 28

      // Label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 16, textHeight + 4)

      // Label text
      ctx.fillStyle = boxColor
      ctx.fillText(labelText, x + 8, y - 10)

      // Draw distance if available
      if (distance) {
        const distText = `${distance.toFixed(1)}m`
        ctx.font = 'bold 18px sans-serif'
        const distMetrics = ctx.measureText(distText)

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(x, y + h + 4, distMetrics.width + 16, 26)
        ctx.fillStyle = boxColor
        ctx.fillText(distText, x + 8, y + h + 24)
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
      <div className={`flex items-center justify-center bg-kora-dark ${className}`}>
        <div className="text-center p-8">
          <div className="text-kora-danger text-2xl mb-4 font-bold">Camera Error</div>
          <div className="text-white text-lg">{error}</div>
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
        <div className="absolute inset-0 flex items-center justify-center bg-kora-dark">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-kora-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-white text-xl">Starting camera...</div>
          </div>
        </div>
      )}
    </div>
  )
}
