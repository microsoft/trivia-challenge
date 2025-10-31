/**
 * Timer Bar Component
 * 
 * Displays the countdown timer with a progress bar in MM:SS format
 */

import { useMemo } from 'react'

interface TimerBarProps {
  timeLeft: number
  maxTime: number
  isLowTime?: boolean
}

export default function TimerBar({ timeLeft, maxTime, isLowTime = false }: TimerBarProps) {
  const progress = useMemo(() => {
    return (timeLeft / maxTime) * 100
  }, [timeLeft, maxTime])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const displayTime = formatTime(timeLeft)

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
