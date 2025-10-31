/**
 * Streak Indicator Component
 * 
 * Displays the player's current streak progress using flask icons and shows
 * the count of fully completed streaks.
 */

import { gameConfig } from '../config/gameConfig'

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

export default function StreakIndicator({
  currentProgress,
  streaksCompleted,
}: StreakIndicatorProps) {
  const flaskCount = gameConfig.streak.visualIndicators
  const clampedProgress = Math.max(0, Math.min(currentProgress, flaskCount))
  const cappedCompleted = Math.max(
    0,
    Math.min(streaksCompleted, gameConfig.timer.maxStreaks)
  )

  return (
    <div className="flex items-center gap-2 px-4" aria-live="polite">
      {/* Streak flasks */}
      <div className="flex gap-2" aria-label="Streak progress">
        {Array.from({ length: flaskCount }).map((_, index) => {
          const isFilled = index < clampedProgress
          return (
            <div
              key={index}
              className={`
                w-8 h-10 rounded-lg transition-all duration-300
                ${isFilled ? 'bg-[#fbbf24] shadow-lg' : 'bg-[#64748b]'}
              `}
              style={{
                boxShadow: isFilled ? '0 0 20px rgba(251, 191, 36, 0.6)' : 'none',
              }}
            >
              {/* Flask icon representation */}
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className={`w-2 h-6 rounded-full ${
                    isFilled ? 'bg-amber-600' : 'bg-slate-700'
                  }`}
                />
              </div>
            </div>
          )
        })}
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
