/**
 * Timer Bar Component
 * 
 * Displays the countdown timer with a progress bar
 */

import { useMemo } from 'react'

interface TimerBarProps {
  timeLeft: number
  maxTime: number
}

export default function TimerBar({ timeLeft, maxTime }: TimerBarProps) {
  const progress = useMemo(() => {
    return (timeLeft / maxTime) * 100
  }, [timeLeft, maxTime])

  const isLowTime = timeLeft <= 5
  const displayTime = Math.floor(timeLeft)

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div
        className="relative h-16 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #1e293b 0%, #1e293b 100%)',
          border: '3px solid #1e293b',
        }}
      >
        {/* Progress bar */}
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-300 ease-linear ${
            isLowTime ? 'bg-red-500' : 'bg-[#FFA500]'
          }`}
          style={{
            width: `${progress}%`,
          }}
        />

        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-3xl font-bold ${
              isLowTime ? 'text-white animate-pulse' : 'text-black'
            }`}
          >
            {displayTime}
          </span>
        </div>
      </div>
    </div>
  )
}
