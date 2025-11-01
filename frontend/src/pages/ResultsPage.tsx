import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useGame } from '../context/GameContext'
import { gameConfig } from '../config/gameConfig'

interface StatDescriptor {
  label: string
  value: string
  helper?: string
}

function formatDuration(totalSeconds: number): string {
  const safeValue = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safeValue / 60)
  const seconds = safeValue % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function StatGroup({ title, stats, caption }: { title: string; stats: StatDescriptor[]; caption?: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
      <header className="border-b border-white/10 px-7 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">{title}</p>
        {caption ? <p className="mt-2 text-sm text-white/45">{caption}</p> : null}
      </header>
      <ul className="divide-y divide-white/8">
        {stats.map((stat) => (
          <li key={stat.label} className="flex items-center justify-between px-7 py-6">
            <div>
              <p className="text-sm font-medium text-white/70">{stat.label}</p>
              {stat.helper ? <p className="mt-1 text-xs text-white/45">{stat.helper}</p> : null}
            </div>
            <span className="text-xl font-semibold text-white">{stat.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const {
    player,
    session,
    score,
    questionsAnswered,
    correctAnswers,
    streaksCompleted,
    timeLeft,
    maxTime,
    resetGame,
  } = useGame()

  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!player) {
      navigate('/signin', { replace: true })
    }
  }, [player, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const baseTime = gameConfig.timer.initialSeconds
  const totalTimeBudget = Math.max(baseTime, maxTime)
  const bonusSecondsEarned = Math.max(0, totalTimeBudget - baseTime)
  const answered = Math.max(0, questionsAnswered)
  const correct = Math.max(0, correctAnswers)
  const incorrect = Math.max(0, answered - correct)
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
  const timeRemaining = Math.max(0, timeLeft)
  const timeSpent = Math.max(0, totalTimeBudget - timeRemaining)
  const completedStreaksDisplay = Math.min(streaksCompleted, gameConfig.timer.maxStreaks)

  const formattedScore = useMemo(() => new Intl.NumberFormat().format(score), [score])

  const performanceStats = useMemo<StatDescriptor[]>(
    () => [
      {
        label: 'Questions Answered',
        value: answered.toString(),
        helper: `${correct} correct · ${incorrect} incorrect`,
      },
      {
        label: 'Accuracy',
        value: `${accuracy}%`,
        helper: answered > 0 ? `${correct}/${answered} answered correctly` : 'No answers submitted',
      },
      {
        label: 'Final Score',
        value: formattedScore,
        helper: 'Includes base points and streak bonuses',
      },
      {
        label: 'Streaks Completed',
        value: completedStreaksDisplay.toString(),
        helper: `+${completedStreaksDisplay * gameConfig.timer.bonusSeconds}s bonus time earned`,
      },
    ],
    [answered, accuracy, correct, incorrect, formattedScore, completedStreaksDisplay]
  )

  const timeStats = useMemo<StatDescriptor[]>(
    () => {
      const percentUsed = totalTimeBudget > 0 ? Math.round((timeSpent / totalTimeBudget) * 100) : 0
      const averagePerQuestion = answered > 0 ? `${formatDuration(timeSpent / answered)}/question` : '—'
      const paceHelper = answered > 0 ? 'Average response time per question' : 'Play again to record a pace'

      return [
        {
          label: 'Total Time Budget',
          value: formatDuration(totalTimeBudget),
          helper: `${baseTime}s base · +${bonusSecondsEarned}s bonus`,
        },
        {
          label: 'Time Spent',
          value: formatDuration(timeSpent),
          helper: `${percentUsed}% of your time used`,
        },
        {
          label: 'Time Remaining',
          value: formatDuration(timeRemaining),
          helper: 'Carry over this momentum to your next run!',
        },
        {
          label: 'Fastest Pace',
          value: averagePerQuestion,
          helper: paceHelper,
        },
      ]
    },
    [answered, baseTime, bonusSecondsEarned, timeRemaining, timeSpent, totalTimeBudget]
  )

  const sessionStats = useMemo<StatDescriptor[]>(
    () => {
      const startedAt = session ? new Date(session.startTime) : null
      return [
        {
          label: 'Session ID',
          value: session?.sessionId ?? 'Unavailable',
          helper: 'Share this code with the Fabric team if you need support',
        },
        {
          label: 'Start Time',
          value: startedAt ? startedAt.toLocaleString() : '—',
          helper: 'Local time when your run began',
        },
        {
          label: 'Question Seed',
          value: session ? String(session.seed) : '—',
          helper: 'Ensures identical question order for analytics',
        },
      ]
    },
    [session]
  )

  const summaryText = useMemo(() => {
    const lines = [
      'Microsoft Fabric IQ Challenge Results',
      `Score: ${score} points`,
      `Accuracy: ${accuracy}% (${correct}/${answered})`,
      `Streaks completed: ${completedStreaksDisplay}`,
      `Time remaining: ${formatDuration(timeRemaining)}`,
    ]
    return lines.join('\n')
  }, [score, accuracy, correct, answered, completedStreaksDisplay, timeRemaining])

  const handlePlayAgain = useCallback(() => {
    resetGame()
    navigate('/', { replace: true })
  }, [navigate, resetGame])

  const handleCopySummary = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText)
        setCopyStatus('success')
        return
      }
      setCopyStatus('error')
    } catch (err) {
      console.error('Unable to copy summary', err)
      setCopyStatus('error')
    }
  }, [summaryText])

  useEffect(() => {
    if (copyStatus === 'idle') {
      return
    }
    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2500)
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040406] text-white">
        <p className="text-sm text-white/60">Redirecting to sign in…</p>
      </div>
    )
  }

  const playerFirstName = player.name.trim().split(/\s+/)[0] || player.name

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" aria-hidden="true" />
        <div className="absolute -top-44 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -right-28 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl" aria-hidden="true" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-10">
    <Header userName={player.name} />

        <main className="mt-6 flex-1">
          <section className="relative overflow-hidden rounded-[34px] border border-amber-200/20 bg-white/5 p-[1.5px] shadow-[0_32px_64px_rgba(0,0,0,0.65)] backdrop-blur-sm">
            <div className="relative rounded-[30px] bg-neutral-950/85 px-8 pb-12 pt-14">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,215,128,0.35)_0%,rgba(17,17,17,0)_70%)]" aria-hidden="true" />

              <div className="relative flex flex-col items-center text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-200/70">Quest Complete</p>
                <h1 className="mt-6 text-3xl font-semibold text-white md:text-4xl">Outstanding work, {playerFirstName}!</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
                  You mastered the Fabric IQ Challenge with confident answers and blazing reflexes. Review your highlights below and get ready to climb the leaderboard.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-amber-200/30 bg-black/40 px-8 py-10 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
                  <span className="text-sm uppercase tracking-[0.35em] text-white/65">Final Score</span>
                  <p className="mt-4 text-6xl font-black text-amber-300 drop-shadow-[0_20px_35px_rgba(217,119,6,0.45)] md:text-7xl">
                    {formattedScore}
                  </p>
                  <p className="mt-4 text-base font-medium text-white/70 md:text-lg">
                    Accuracy {accuracy}% · {correct}/{answered} correct answers
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {completedStreaksDisplay} completed streak{completedStreaksDisplay === 1 ? '' : 's'} · {formatDuration(timeRemaining)} remaining
                  </p>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 md:flex-row">
                  <button
                    type="button"
                    onClick={handlePlayAgain}
                    className="w-full max-w-xs rounded-2xl bg-linear-to-r from-amber-400 via-amber-300 to-amber-500 py-3.5 text-lg font-semibold text-[#2b1800] shadow-[0_18px_42px_rgba(251,191,36,0.45)] transition hover:brightness-[1.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                  >
                    Play Again
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="w-full max-w-xs rounded-2xl border border-white/20 bg-white/5 py-3.5 text-lg font-semibold text-white shadow-[0_18px_42px_rgba(0,0,0,0.45)] transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  >
                    Copy Summary
                  </button>
                </div>

                <p className="mt-2 text-sm text-white/55" role="status">
                  {copyStatus === 'success' && 'Results copied to clipboard. Share your victory!'}
                  {copyStatus === 'error' && 'Copy unavailable in this browser. Try capturing a screenshot.'}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-7 lg:grid-cols-2">
            <StatGroup
              title="Performance Summary"
              caption="Your responses and streaks across this session"
              stats={performanceStats}
            />
            <StatGroup
              title="Time & Momentum"
              caption="How you managed the dynamic timer and streak bonuses"
              stats={timeStats}
            />
          </section>

          <section className="mt-12">
            <StatGroup
              title="Session Details"
              caption="Keep these handy for support or bragging rights"
              stats={sessionStats}
            />
          </section>
        </main>
      </div>
    </div>
  )
}
