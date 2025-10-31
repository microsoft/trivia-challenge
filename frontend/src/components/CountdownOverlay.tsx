/**
 * CountdownOverlay Component
 * 
 * Displays a full-screen countdown (3, 2, 1, GO!) before the game starts.
 * Uses large animated text with smooth transitions.
 */

import { useEffect, useState } from 'react'

interface CountdownOverlayProps {
  value: number
  onComplete?: () => void
}

export default function CountdownOverlay({ value, onComplete }: CountdownOverlayProps) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    // Trigger animation
    setAnimate(true)
    const timeout = setTimeout(() => setAnimate(false), 100)
    return () => clearTimeout(timeout)
  }, [value])

  useEffect(() => {
    if (value <= 0 && onComplete) {
      // Small delay before calling onComplete to show "GO!"
      const timeout = setTimeout(onComplete, 500)
      return () => clearTimeout(timeout)
    }
  }, [value, onComplete])

  const displayText = value > 0 ? value.toString() : 'GO!'
  const textColor = value > 0 ? 'text-white' : 'text-green-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={`
          text-[12rem] font-bold transition-all duration-100
          ${textColor}
          ${animate ? 'scale-110' : 'scale-100'}
        `}
      >
        {displayText}
      </div>
    </div>
  )
}
