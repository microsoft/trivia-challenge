/**
 * BonusTimeNotification Component
 * 
 * Animated notification that appears when bonus time is awarded for streak completion.
 * Shows the bonus amount with a fade-in/fade-out animation.
 */

import { useEffect, useRef, useState } from 'react'

interface BonusTimeNotificationProps {
  bonusSeconds: number
  show: boolean
  onAnimationComplete?: () => void
}

export default function BonusTimeNotification({
  bonusSeconds,
  show,
  onAnimationComplete,
}: BonusTimeNotificationProps) {
  const [visible, setVisible] = useState(false)
  const onCompleteRef = useRef(onAnimationComplete)

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete
  }, [onAnimationComplete])

  useEffect(() => {
    if (!show) {
      setVisible(false)
      return
    }

    setVisible(true)

    // Auto-hide after animation window
    const timeout = window.setTimeout(() => {
      setVisible(false)
      onCompleteRef.current?.()
    }, 5000)

    return () => window.clearTimeout(timeout)
  }, [show])

  if (!visible) return null

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
      <div className="bg-linear-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full shadow-2xl border-4 border-white">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-2xl font-bold">+{bonusSeconds}s Bonus!</span>
        </div>
      </div>
    </div>
  )
}
