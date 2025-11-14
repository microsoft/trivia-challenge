/**
 * Game Header Component
 * 
 * Unified header showing game name, timer, streak indicators, 
 * and question progress with correct/incorrect ratio.
 */

import { useMemo } from 'react'
import StreakIndicator from './StreakIndicator'
import HeartIndicator from './HeartIndicator'

interface GameHeaderProps {
  timeLeft: number
  maxTime: number
  isLowTime?: boolean
  currentProgress: number
  streaksCompleted: number
  questionsAnswered: number
  totalQuestions: number
  correctAnswers: number
  heartsRemaining: number
  maxHearts: number
}

export default function GameHeader({
  timeLeft,
  maxTime,
  isLowTime = false,
  currentProgress,
  streaksCompleted,
  questionsAnswered,
  totalQuestions,
  correctAnswers,
  heartsRemaining,
  maxHearts,
}: GameHeaderProps) {
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

  const textColor = '#f8fafc'

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const displayTime = formatTime(timeLeft)

  const incorrectAnswers = questionsAnswered - correctAnswers
  const correctRatio = questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0
  const incorrectRatio = questionsAnswered > 0 ? (incorrectAnswers / questionsAnswered) * 100 : 0

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 bg-slate-900/50 rounded-2xl border border-slate-800">
      <div className="flex items-center gap-6">
        <div className="shrink-0">
          <StreakIndicator
            currentProgress={currentProgress}
            streaksCompleted={streaksCompleted}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="relative h-12 rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #1e293b 0%, #1e293b 100%)',
              border: '3px solid #1e293b',
            }}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: progressColor,
                transition: 'width 200ms linear, background-color 250ms ease',
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-2xl font-bold ${
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

        <div className="shrink-0">
          <HeartIndicator
            heartsRemaining={heartsRemaining}
            maxHearts={maxHearts}
            showLabel={false}
          />
        </div>
      </div>
    </div>
  )
}
