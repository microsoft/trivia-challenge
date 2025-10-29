/**
 * Streak Indicator Component
 * 
 * Displays 5 flask-shaped indicators for the streak system
 */

interface StreakIndicatorProps {
  currentStreak: number
  streaksCompleted: number
}

export default function StreakIndicator({
  currentStreak,
  streaksCompleted,
}: StreakIndicatorProps) {
  const flaskCount = 5
  const filledFlasks = currentStreak % flaskCount

  return (
    <div className="flex items-center gap-2 px-4">
      {/* Streak flasks */}
      <div className="flex gap-2">
        {Array.from({ length: flaskCount }).map((_, index) => {
          const isFilled = index < filledFlasks
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
      {streaksCompleted > 0 && (
        <div className="ml-2 px-3 py-1 bg-[#fbbf24] rounded-full">
          <span className="text-black font-bold text-sm">x{streaksCompleted}</span>
        </div>
      )}
    </div>
  )
}
