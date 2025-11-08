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

    // Draw 3x3 grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
    ctx.lineWidth = 1
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
      const { bbox, label, confidence, color } = detection

      if (!bbox || bbox.length !== 4) return

      const [x, y, w, h] = bbox

      // Determine color
      const boxColor = color || (isInCenter(x, y, w, h, canvas.width, canvas.height)
        ? 'rgba(255, 215, 0, 0.8)'  // Yellow for center objects
        : 'rgba(0, 255, 0, 0.8)')    // Green for others

      // Draw bounding box
      ctx.strokeStyle = boxColor
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)

      // Draw label background
      const labelText = `${label} ${(confidence * 100).toFixed(0)}%`
      ctx.font = '16px sans-serif'
      const textMetrics = ctx.measureText(labelText)
      const textHeight = 20

      ctx.fillStyle = boxColor
      ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 10, textHeight + 4)

      // Draw label text
      ctx.fillStyle = '#000'
      ctx.fillText(labelText, x + 5, y - 8)

      // Draw distance if available
      if (detection.distance) {
        const distText = `${detection.distance.toFixed(1)}m`
        ctx.fillStyle = boxColor
        ctx.fillRect(x, y + h + 4, 60, textHeight)
        ctx.fillStyle = '#000'
        ctx.fillText(distText, x + 5, y + h + 18)
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
      <div className={`flex items-center justify-center bg-kora-panel rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 text-lg mb-2">Camera Error</div>
          <div className="text-gray-400">{error}</div>
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
        className="w-full h-full object-cover rounded-lg"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-kora-panel">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kora-blue mx-auto mb-4"></div>
            <div className="text-gray-400">Initializing camera...</div>
          </div>
        </div>
      )}
    </div>
  )
}
