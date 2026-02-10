/**
 * Streak Indicator Component
 * 
 * Displays the player's current streak progress using Microsoft Fabric icons
 * (or the current question pool icon if a non-default pool is selected)
 * and shows the count of fully completed streaks.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  Fabric32Color,
  Fabric32Filled
} from '@fabric-msft/svg-icons'
import { gameConfig } from '../config/gameConfig'
import { useGame } from '../context/GameContext'

interface StreakIndicatorProps {
  /**
   * Current streak progress within the active streak tier (0 to threshold)
   */
  currentProgress: number
  /**
   * Number of fully completed streaks
   */
  streaksCompleted: number
}

const fabricIcons = [
  { Color: Fabric32Color, Filled: Fabric32Filled, name: 'One good answer' },
  { Color: Fabric32Color, Filled: Fabric32Filled, name: 'Two good answers' },
  { Color: Fabric32Color, Filled: Fabric32Filled, name: 'Three good answers' },
  { Color: Fabric32Color, Filled: Fabric32Filled, name: 'Four good answers' },
  { Color: Fabric32Color, Filled: Fabric32Filled, name: 'Five good answers' },
]

type ConfettiPiece = {
  id: number
  left: number
  translateX: number
  delay: number
  duration: number
  color: string
  rotation: number
}

type ConfettiStyle = CSSProperties & {
  '--confetti-x': string
  '--confetti-rotation': string
}

const confettiColors = ['#10b981', '#3b82f6', '#a855f7', '#f97316', '#facc15']
const CONFETTI_DURATION_MS = 2200
const CELEBRATION_DURATION_MS = 3000

function generateConfettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: index,
    left: Math.random() * 100,
    translateX: Math.random() * 60 - 30,
    delay: Math.random() * 0.2,
    duration: 0.9 + Math.random() * 0.6,
    color: confettiColors[index % confettiColors.length],
    rotation: Math.random() * 360,
  }))
}

export default function StreakIndicator({
  currentProgress,
  streaksCompleted,
}: StreakIndicatorProps) {
  const { selectedPool } = useGame()
  const flaskCount = gameConfig.streak.visualIndicators
  const clampedProgress = Math.max(0, Math.min(currentProgress, flaskCount))
  const cappedCompleted = Math.max(
    0,
    Math.min(streaksCompleted, gameConfig.timer.maxStreaks)
  )

  // Use pool icon if a non-default pool is selected
  const usePoolIcon = selectedPool && selectedPool.id !== 'default'
  const poolIconPath = selectedPool?.iconPath

  const [isCelebrating, setIsCelebrating] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([])
  const [justActivatedIndex, setJustActivatedIndex] = useState<number | null>(null)
  const previousCompletedRef = useRef(cappedCompleted)

  const iconSlots = useMemo(() => {
    return Array.from({ length: flaskCount }).map((_, index) => {
      const iconSet = fabricIcons[index % fabricIcons.length]
      return {
        ...iconSet,
        index,
      }
    })
  }, [flaskCount])

  useEffect(() => {
    let celebrationTimer: number | undefined
    let confettiTimer: number | undefined

    if (cappedCompleted > previousCompletedRef.current) {
      setIsCelebrating(true)
      setConfettiPieces(generateConfettiPieces(flaskCount * 4))

      celebrationTimer = window.setTimeout(() => {
        setIsCelebrating(false)
      }, CELEBRATION_DURATION_MS)

      confettiTimer = window.setTimeout(() => {
        setConfettiPieces([])
      }, CONFETTI_DURATION_MS)
    }

    previousCompletedRef.current = cappedCompleted

    return () => {
      if (celebrationTimer !== undefined) {
        clearTimeout(celebrationTimer)
      }
      if (confettiTimer !== undefined) {
        clearTimeout(confettiTimer)
      }
    }
  }, [cappedCompleted, flaskCount])

  useEffect(() => {
    // Detect when a new icon is activated (for bounce animation)
    if (clampedProgress > 0 && !isCelebrating) {
      setJustActivatedIndex(clampedProgress - 1)
      const timer = setTimeout(() => {
        setJustActivatedIndex(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [clampedProgress, isCelebrating])

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      {/* Streak icons */}
      <div className="relative" aria-label="Streak progress">
        <div className="flex gap-2 relative z-10">
          {iconSlots.map(({ Color, Filled, name, index }) => {
            const isFilled = isCelebrating ? true : index < clampedProgress
            const isJustActivated = justActivatedIndex === index

            // Use pool icon for non-default pools, otherwise use Fabric icons
            if (usePoolIcon && poolIconPath) {
              return (
                <div
                  key={index}
                  className={`
                    transition-all duration-300
                    ${!isFilled ? 'opacity-30 grayscale' : 'opacity-100'}
                    ${isJustActivated && !isCelebrating ? 'animate-bounce' : ''}
                    ${isCelebrating ? 'animate-pulse scale-110' : 'scale-100'}
                  `}
                  title={name}
                >
                  <img
                    src={poolIconPath}
                    alt=""
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/pools/default.svg'
                    }}
                  />
                </div>
              )
            }

            const IconComponent = isFilled ? Color : Filled

            return (
              <div
                key={index}
                className={`
                transition-all duration-300
                ${!isFilled ? 'opacity-50' : 'opacity-100'}
                ${isJustActivated && !isCelebrating ? 'animate-bounce' : ''}
                ${isCelebrating ? 'animate-pulse scale-110' : 'scale-100'}
              `}
                title={name}
              >
                <IconComponent className="w-8 h-8" />
              </div>
            )
          })}
        </div>

        {isCelebrating && confettiPieces.length > 0 && (
          <div className="pointer-events-none absolute inset-0 -top-6 -bottom-10">
            {confettiPieces.map(piece => {
              const pieceStyle: ConfettiStyle = {
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: piece.color,
                '--confetti-x': `${piece.translateX}px`,
                '--confetti-rotation': `${piece.rotation}deg`,
              }

              return (
                <span key={piece.id} className="confetti-piece" style={pieceStyle} />
              )
            })}
          </div>
        )}
      </div>

      {/* Completed streaks counter */}
      {cappedCompleted > 0 && (
        <div
          className="ml-2 px-3 py-1 bg-[#fbbf24] rounded-full"
          aria-label={`Completed streaks ${cappedCompleted}`}
        >
          <span className="text-black font-bold text-sm">x{cappedCompleted}</span>
        </div>
      )}
    </div>
  )
}
