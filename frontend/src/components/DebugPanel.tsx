import { useRef, useEffect, useState } from 'react'
import { useDevMode } from '../context/DevModeContext'
import { useGame } from '../context/GameContext'
import { gameConfig } from '../config/gameConfig'
import type { AnalyticsQueueItem } from '../types/telemetry'

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString()
  } catch {
    return isoString
  }
}

function summarizePayload(properties?: Record<string, unknown>): string {
  if (!properties || Object.keys(properties).length === 0) return ''
  const entries = Object.entries(properties)
  const shown = entries.slice(0, 3)
  const parts = shown.map(([k, v]) => {
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return `${k}: ${val.length > 30 ? val.slice(0, 30) + '…' : val}`
  })
  if (entries.length > 3) {
    parts.push(`+${entries.length - 3} more`)
  }
  return parts.join(', ')
}

function EventRow({ item, onExpand }: { item: AnalyticsQueueItem; onExpand: () => void }) {
  const typeColors: Record<string, string> = {
    game: 'text-green-300',
    user: 'text-cyan-300',
    pageview: 'text-yellow-300',
    interaction: 'text-orange-300',
    custom: 'text-gray-300',
  }

  return (
    <button
      type="button"
      onClick={onExpand}
      className="mb-1 w-full cursor-pointer rounded border border-green-900/60 bg-green-950/40 px-2 py-1 text-left font-mono text-xs hover:bg-green-900/40"
    >
      <div className="flex items-start gap-2">
        <span className={`font-bold ${typeColors[item.type] ?? 'text-gray-300'}`}>
          {item.event}
        </span>
        <span className="shrink-0 text-green-600">{formatTime(item.timestamp)}</span>
      </div>
      <div className="truncate text-green-500/80">
        {summarizePayload(item.properties as Record<string, unknown>)}
      </div>
    </button>
  )
}

function ExpandedEvent({
  item,
  onClose,
}: {
  item: AnalyticsQueueItem
  onClose: () => void
}) {
  const jsonStr = JSON.stringify(item, null, 2)

  return (
    <div className="rounded border border-green-700/60 bg-black/80 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-green-300">{item.event}</span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-xs text-green-500 hover:text-green-300"
        >
          ✕ Close
        </button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-green-400/90">
        {jsonStr}
      </pre>
    </div>
  )
}

export default function DebugPanel() {
  const {
    isDevMode,
    toggleDevMode,
    eventLog,
    clearEventLog,
    isPaused,
    togglePause,
  } = useDevMode()

  const {
    setScore,
    setCorrectAnswers,
    score,
    currentStreak,
    setCurrentStreak,
    streaksCompleted,
    setStreaksCompleted,
    setTimeLeft,
    maxTime,
    hearts,
    setHearts,
    questionsAnswered,
    setQuestionsAnswered,
  } = useGame()

  const logEndRef = useRef<HTMLDivElement>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Auto-scroll to the bottom when new events arrive
  useEffect(() => {
    if (!isPaused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [eventLog, isPaused])

  if (!isDevMode) return null

  const handleAnswerCorrectly = () => {
    setScore(prev => prev + gameConfig.scoring.pointsPerCorrectAnswer)
    setCorrectAnswers(prev => prev + 1)
    setQuestionsAnswered(prev => prev + 1)

    const newStreak = currentStreak + 1
    if (newStreak >= gameConfig.streak.threshold) {
      setCurrentStreak(0)
      setStreaksCompleted(prev => prev + 1)
    } else {
      setCurrentStreak(newStreak)
    }
  }

  const handleSkipQuestion = () => {
    setQuestionsAnswered(prev => prev + 1)
  }

  const handleEarnTimeBonus = () => {
    if (streaksCompleted < gameConfig.timer.maxStreaks) {
      const bonus = gameConfig.timer.bonusSeconds
      setTimeLeft(prev => Math.min(prev + bonus, maxTime + bonus))
      setStreaksCompleted(prev => prev + 1)
      setCurrentStreak(0)
    }
  }

  const handleAddLife = () => {
    setHearts(prev => prev + 1)
  }

  return (
    <>
      {/* Debug mode border indicator */}
      <div className="pointer-events-none fixed inset-0 z-[9998] border-2 border-green-500/50" />

      {/* Debug panel */}
      <div className="fixed right-0 bottom-0 left-0 z-[9999] flex flex-col border-t-2 border-green-500 bg-[#0a0f0a]/95 font-mono text-green-300 shadow-[0_-4px_20px_rgba(34,197,94,0.15)]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-green-900/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🔧</span>
            <span className="text-sm font-bold tracking-wide text-green-400">Debug Mode</span>
            <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-500">
              {eventLog.length} events
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(prev => !prev)}
              className="cursor-pointer rounded px-2 py-0.5 text-xs text-green-500 hover:bg-green-900/40 hover:text-green-300"
            >
              {isMinimized ? '▲ Expand' : '▼ Minimize'}
            </button>
            <button
              type="button"
              onClick={toggleDevMode}
              className="cursor-pointer rounded px-2 py-0.5 text-xs text-green-500 hover:bg-red-900/40 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex max-h-64 gap-4 overflow-hidden p-4">
            {/* Test Actions Section */}
            <div className="flex w-1/2 shrink-0 flex-col">
              <div className="mb-2 flex items-center gap-1 text-xs font-bold tracking-wider text-green-400">
                <span>⚡</span> TEST ACTIONS
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAnswerCorrectly}
                  className="cursor-pointer rounded border border-green-800/60 bg-green-950/50 px-3 py-2 text-xs text-green-300 hover:bg-green-900/50"
                >
                  ✅ Answer Correctly
                </button>
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="cursor-pointer rounded border border-green-800/60 bg-green-950/50 px-3 py-2 text-xs text-green-300 hover:bg-green-900/50"
                >
                  ⏭️ Skip Question
                </button>
                <button
                  type="button"
                  onClick={handleEarnTimeBonus}
                  className="cursor-pointer rounded border border-green-800/60 bg-green-950/50 px-3 py-2 text-xs text-green-300 hover:bg-green-900/50"
                >
                  🏆 Earn Time Bonus
                </button>
                <button
                  type="button"
                  onClick={handleAddLife}
                  className="cursor-pointer rounded border border-green-800/60 bg-green-950/50 px-3 py-2 text-xs text-green-300 hover:bg-green-900/50"
                >
                  ❤️ Add Life
                </button>
              </div>
              <div className="mt-3 rounded border border-green-900/40 bg-green-950/30 p-2 text-xs text-green-600">
                <div>Score: {score} | Streak: {currentStreak}/{gameConfig.streak.threshold} | Streaks: {streaksCompleted}</div>
                <div>Hearts: {hearts} | Answered: {questionsAnswered}</div>
              </div>
            </div>

            {/* Analytics Output Section */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-bold tracking-wider text-green-400">
                  <span>📊</span> ANALYTICS OUTPUT
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="cursor-pointer rounded px-2 py-0.5 text-xs text-green-500 hover:bg-green-900/40 hover:text-green-300"
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button
                    type="button"
                    onClick={clearEventLog}
                    className="cursor-pointer rounded px-2 py-0.5 text-xs text-green-500 hover:bg-green-900/40 hover:text-green-300"
                  >
                    🗑 Clear
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto rounded border border-green-900/40 bg-black/40 p-2">
                {eventLog.length === 0 ? (
                  <div className="py-4 text-center text-xs text-green-700">
                    No events captured yet. Interact with the game to see telemetry events.
                  </div>
                ) : (
                  eventLog.map((item, i) =>
                    expandedIndex === i ? (
                      <ExpandedEvent
                        key={`${item.timestamp}-${i}`}
                        item={item}
                        onClose={() => setExpandedIndex(null)}
                      />
                    ) : (
                      <EventRow
                        key={`${item.timestamp}-${i}`}
                        item={item}
                        onExpand={() => setExpandedIndex(i)}
                      />
                    ),
                  )
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
