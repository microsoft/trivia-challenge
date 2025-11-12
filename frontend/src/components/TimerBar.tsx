/**
 * Timer Bar Component
 * 
 * Displays the countdown timer with a progress bar in MM:SS format
 */

import { useMemo } from 'react'

const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace('#', '')
  const normalized = cleaned.length === 3
    ? cleaned.split('').map(char => char + char).join('')
    : cleaned
  const intValue = parseInt(normalized, 16)
  const r = (intValue >> 16) & 255
  const g = (intValue >> 8) & 255
  const b = intValue & 255
  return [r / 255, g / 255, b / 255]
}

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

interface TimerBarProps {
  timeLeft: number
  maxTime: number
  isLowTime?: boolean
}

export default function TimerBar({ timeLeft, maxTime, isLowTime = false }: TimerBarProps) {
  const ratio = useMemo(() => {
    if (maxTime <= 0) {
      return 0
    }
    const value = timeLeft / maxTime
    return Math.min(Math.max(value, 0), 1)
  }, [timeLeft, maxTime])

  const progress = useMemo(() => {
    return ratio * 100
  }, [ratio])

  const progressColor = useMemo(() => {
    if (ratio >= 0.75) {
      return '#10b981'
    }
    if (ratio >= 0.5) {
      return '#3b82f6'
    }
    if (ratio >= 0.25) {
      return '#facc15'
    }
    return '#ef4444'
  }, [ratio])

  const textColor = useMemo(() => {
    return '#f8fafc' //'#0f172a' // : '#f8fafc'
  }, [progressColor])

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
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: progressColor,
            transition: 'width 200ms linear, background-color 250ms ease',
          }}
        />

        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-3xl font-bold ${
              isLowTime ? 'animate-pulse' : ''
            }`}
            style={{
              color: textColor,
            }}
          >
            {displayTime}
          </span>
        </div>
      </div>
    </div>
  )
}
