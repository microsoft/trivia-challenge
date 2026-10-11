import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import HeartIndicator from '../components/HeartIndicator'
import { useGame } from '../context/GameContext'
import { gameConfig } from '../config/gameConfig'
import { analytics } from '../services/analyticsService'
import QRCode from 'react-qr-code'

function formatDuration(totalSeconds: number): string {
  const safeValue = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safeValue / 60)
  const seconds = safeValue % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatHeartsValue(totalHearts: number): string {
  const safeValue = Math.max(0, totalHearts)
  return Number.isInteger(safeValue) ? safeValue.toFixed(0) : safeValue.toFixed(1)
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-white/50">{children}</p>
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const value = Math.min(100, Math.max(0, accuracy))
  return (
    <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`Accuracy ${value}%`}>
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="results-accuracy-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        {value > 0 && (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#results-accuracy-ring)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            className="drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <p className={`${value === 100 ? 'text-[2.6rem]' : 'text-5xl'} font-bold tabular-nums`}>
          {value}
          <span className="text-2xl text-white/55">%</span>
        </p>
        <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/50">Accuracy</p>
      </div>
    </div>
  )
}

function AnswerSplit({ answered, correct, incorrect }: { answered: number; correct: number; incorrect: number }) {
  return (
    <div className="min-w-0 flex-1">
      <Eyebrow>Answers</Eyebrow>
      <p className="mt-2 text-5xl font-semibold tabular-nums">
        {answered}
        <span className="ml-3 text-lg font-normal text-white/50">answered</span>
      </p>
      <div className="mt-5 flex h-3 gap-1 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
        {correct > 0 && <div className="rounded-full bg-emerald-400" style={{ flexGrow: correct }} />}
        {incorrect > 0 && <div className="rounded-full bg-rose-400" style={{ flexGrow: incorrect }} />}
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="flex items-center gap-2 text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          {correct} correct
        </span>
        <span className={`flex items-center gap-2 ${incorrect > 0 ? 'text-rose-300' : 'text-white/40'}`}>
          {incorrect} missed
          <span className={`h-2 w-2 rounded-full ${incorrect > 0 ? 'bg-rose-400' : 'bg-white/25'}`} aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}

function Metric({ label, value, suffix, children }: { label: string; value: string; suffix?: string; children: ReactNode }) {
  return (
    <div className="px-6 first:pl-0 last:pr-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value}
        {suffix ? <span className="ml-1.5 text-base font-normal text-white/45">{suffix}</span> : null}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function MetricHelper({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-white/45">{children}</p>
}

const QR_LINKS = [
  {
    id: 'leaderboard',
    title: 'View the Leaderboard',
    href: 'https://aka.ms/trivia-powerbi',
    description: 'See how your score compares.',
  },
  {
    id: 'learn-fabric',
    title: 'Learn More About Fabric',
    href: 'https://aka.ms/fabrictrivia/f',
    description: 'Tutorials, case studies, highlights.',
  },
  {
    id: 'certifications',
    title: 'Get Fabric Certified',
    href: 'https://aka.ms/eu/cert',
    description: 'Certifications and study guides.',
  },
] as const

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
    hearts,
    gameOverReason,
    missedQuestions,
    resetGame,
    setPlayer,
    setSelectedPool,
    saveState,
    savedSummary,
    retrySave,
  } = useGame()

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
  const heartsRemaining = Math.max(0, hearts)
  const heartsDepleted = heartsRemaining <= 0 || gameOverReason === 'hearts.depleted'

  const formattedScore = useMemo(() => new Intl.NumberFormat().format(score), [score])
  const maxStreaks = gameConfig.timer.maxStreaks
  const maxTotalSeconds = Math.max(gameConfig.timer.maxTotalSeconds, totalTimeBudget)
  const averagePace = answered > 0 ? formatDuration(timeSpent / answered) : '—'

  const playerName = (player?.name ?? '').trim()
  const playerDisplayName = playerName || player?.name || 'Player'
  const sessionTag = session?.sessionId ? session.sessionId.slice(0, 8).toUpperCase() : '--------'
  const failedQuestions = missedQuestions
  const hasFailedQuestions = failedQuestions.length > 0

  const accuracyFeedback = useMemo(() => {
    if (accuracy >= 95) {
      return {
        title: `Legendary accuracy, ${playerDisplayName}!`,
        message: 'Every tap landed perfectly. The leaderboard should be nervous about your next run.',
      }
    }

    if (accuracy >= 85) {
      return {
        title: `Elite run, ${playerDisplayName}.`,
        message: 'You read the board like a pro and kept the streak meter glowing. Another game could put you on top.',
      }
    }

    if (accuracy >= 70) {
      return {
        title: `Great rhythm, ${playerDisplayName}!`,
        message: 'Smart calls and solid pace—one more push and those streak bonuses are yours for the taking.',
      }
    }

    if (accuracy >= 50) {
      return {
        title: `Solid hustle, ${playerDisplayName}.`,
        message: 'You kept the momentum alive. Sharpen a couple answers and you will turbocharge your score.',
      }
    }

    return {
      title: `Bold effort, ${playerDisplayName}!`,
      message: 'You kept swinging and learned the terrain. Queue up another round and turn those insights into streaks.',
    }
  }, [accuracy, playerDisplayName])

  const heartsFeedback = useMemo(
    () => ({
      title: `Sorry, ${playerDisplayName}.`,
      message: 'You ran out of hearts 💔. Review the questions you missed and jump back in for another run.',
    }),
    [playerDisplayName]
  )

  const heroFeedback = heartsDepleted ? heartsFeedback : accuracyFeedback
  const resultBadgeLabel = heartsDepleted ? 'Game Over' : 'Quest Complete'
  const badgeTone = heartsDepleted ? 'bg-rose-400/10 text-rose-200' : 'bg-amber-300/10 text-amber-200'
  const badgeDotTone = heartsDepleted ? 'bg-rose-400' : 'bg-amber-300'

  const handlePlayAgain = useCallback(() => {
    if (!savedSummary) return
    resetGame()
    setSelectedPool(null)
    analytics.setSession(null)
    analytics.setPool(null)
    navigate('/select-pool', { replace: true })
  }, [navigate, resetGame, savedSummary, setSelectedPool])

  const handleReset = useCallback(() => {
    if (!savedSummary) return
    resetGame()
    setPlayer(null)
    setSelectedPool(null)
    analytics.identify(null)
    analytics.setSession(null)
    analytics.setPool(null)
    navigate('/', { replace: true })
  }, [navigate, resetGame, savedSummary, setPlayer, setSelectedPool])

  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040406] text-white">
        <p className="text-sm text-white/60">Redirecting to sign in…</p>
      </div>
    )
  }

  if (!savedSummary) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
          <Header userName={player.name} />
          <section className="my-auto rounded-3xl border border-amber-200/20 bg-white/5 p-8 text-center">
            <h1 className="text-2xl font-semibold">
              {saveState.status === 'error' ? 'Your game could not be saved' : 'Saving your results'}
            </h1>
            <p className="mt-4 text-white/70" role={saveState.status === 'error' ? 'alert' : 'status'}>
              {saveState.error ?? (session
                ? `Waiting for ${saveState.pendingAnswers} answer${saveState.pendingAnswers === 1 ? '' : 's'} and the final saved summary.`
                : 'No completed game is available in this tab.')}
            </p>
            {session && <p className="mt-3 text-sm text-white/60">Keep this tab open. Your final score appears only after the backend confirms it.</p>}
            {session && <p className="mt-3 break-all font-mono text-xs text-white/50">Session: {session.sessionId}</p>}
            {saveState.status === 'error' && (
              <button type="button" onClick={retrySave} className="mt-6 rounded-2xl bg-amber-400 px-6 py-3 font-semibold text-black">
                Retry saving results
              </button>
            )}
            {!session && (
              <button type="button" onClick={() => navigate('/instructions', { replace: true })} className="mt-6 rounded-2xl bg-amber-400 px-6 py-3 font-semibold text-black">
                Return to instructions
              </button>
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" />
        <div className="absolute -top-44 left-[22%] h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-28 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-12 px-6 py-9 xl:h-screen xl:min-h-[62rem] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-16 xl:px-10">
        <section className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between gap-4 text-sm text-white/55">
            <span className="flex items-center gap-3">
              <img src="/fabriclogo.png" alt="" className="h-7 w-7" />
              The Microsoft Fabric Trivia Challenge
            </span>
            <span className="font-mono text-xs tracking-[0.2em] text-white/40">
              <span className="text-white/30">Session </span>
              {sessionTag}
            </span>
          </header>

          <p
            className={`mt-10 inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] ${badgeTone}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badgeDotTone}`} aria-hidden="true" />
            {resultBadgeLabel}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">{heroFeedback.title}</h1>
          <p className="mt-2 max-w-md text-base text-white/60">{heroFeedback.message}</p>

          <div className="mt-8">
            <Eyebrow>Final score</Eyebrow>
            <p className="mt-1 bg-linear-to-b from-amber-200 to-amber-500 bg-clip-text text-[7.5rem] font-black leading-none text-transparent tabular-nums drop-shadow-[0_18px_40px_rgba(217,119,6,0.35)]">
              {formattedScore}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="rounded-2xl bg-linear-to-r from-amber-400 via-amber-300 to-amber-500 px-6 py-4 text-lg font-semibold text-[#2b1800] shadow-[0_18px_42px_rgba(251,191,36,0.4)] transition hover:brightness-[1.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border border-amber-200/45 px-6 py-4 text-lg font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              Reset
            </button>
          </div>
          <p className="mt-3 text-sm text-white/55">
            Please allow others to play next (click Reset) if there is a line behind you.
          </p>

          <div className="mt-12 xl:mt-auto">
            <Eyebrow>Keep exploring · scan with your phone</Eyebrow>
            <ul className="mt-4 grid grid-cols-3 gap-4">
              {QR_LINKS.map((link) => (
                <li key={link.id} className="flex flex-col items-center text-center">
                  <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-amber-200/15" role="img" aria-label={`${link.title} QR code`}>
                    <QRCode value={link.href} size={150} bgColor="transparent" fgColor="#FCD34D" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{link.title}</p>
                  <p className="mt-0.5 text-xs text-white/50">{link.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="relative flex min-h-0 flex-col" aria-label="Run summary">
          <div
            className="absolute -left-8 top-0 hidden h-full w-px bg-linear-to-b from-transparent via-white/15 to-transparent xl:block"
            aria-hidden="true"
          />
          <Eyebrow>Run summary</Eyebrow>
          <div className="mt-5 flex items-center gap-10">
            <AccuracyRing accuracy={accuracy} />
            <AnswerSplit answered={answered} correct={correct} incorrect={incorrect} />
          </div>

          <div className="mt-7 grid grid-cols-4 divide-x divide-white/10 border-y border-white/10 py-6">
            <Metric label="Streaks" value={completedStreaksDisplay.toString()} suffix={`/ ${maxStreaks}`}>
              <div className="flex gap-1.5" aria-hidden="true">
                {Array.from({ length: maxStreaks }, (_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${
                      index < completedStreaksDisplay ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-white/12'
                    }`}
                  />
                ))}
              </div>
              <MetricHelper>
                {completedStreaksDisplay > 0
                  ? `+${completedStreaksDisplay * gameConfig.timer.bonusSeconds}s bonus time earned`
                  : 'Rack up streaks to unlock extra time'}
              </MetricHelper>
            </Metric>
            <Metric
              label="Hearts"
              value={formatHeartsValue(heartsRemaining)}
              suffix={`/ ${formatHeartsValue(gameConfig.hearts.initialCount)}`}
            >
              <div className="w-fit">
                <HeartIndicator heartsRemaining={heartsRemaining} maxHearts={gameConfig.hearts.initialCount} showLabel={false} />
              </div>
              <MetricHelper>
                {heartsDepleted ? 'All hearts spent' : `−${gameConfig.hearts.decrementOnWrong} per wrong answer`}
              </MetricHelper>
            </Metric>
            <Metric label="Time budget" value={formatDuration(totalTimeBudget)}>
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                <span className="rounded-full bg-sky-400" style={{ width: `${percentOf(baseTime, maxTotalSeconds)}%` }} />
                {bonusSecondsEarned > 0 && (
                  <span className="rounded-full bg-amber-300" style={{ width: `${percentOf(bonusSecondsEarned, maxTotalSeconds)}%` }} />
                )}
              </div>
              <MetricHelper>
                {baseTime}s base · +{bonusSecondsEarned}s bonus
              </MetricHelper>
            </Metric>
            <Metric label="Avg pace" value={averagePace} suffix={answered > 0 ? '/ question' : undefined}>
              <p className="text-xs text-white/45">
                {answered > 0 ? 'Average response time' : 'Play to record a pace'}
              </p>
            </Metric>
          </div>

          <div className="mt-7 flex items-baseline justify-between gap-4">
            <h2 className="flex items-center gap-3 text-lg font-semibold">
              Missed questions
              <span className="rounded-full bg-rose-400/15 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-rose-200">
                {failedQuestions.length}
              </span>
            </h2>
            {hasFailedQuestions ? (
              <p className="text-xs text-white/45" aria-hidden="true">
                ✓ correct answer · ✕ your answer
              </p>
            ) : null}
          </div>
          <div className="mt-2 flex min-h-0 flex-1 flex-col">
            {hasFailedQuestions ? (
              <ol className="min-h-0 flex-1 pb-10 xl:overflow-y-auto xl:[mask-image:linear-gradient(to_bottom,black_88%,transparent)]">
                {failedQuestions.map((question, index) => {
                  const correctChoice = question.choices[question.correctAnswerIndex] ?? 'Unavailable'
                  const selectedChoice = question.choices[question.selectedAnswerIndex] ?? 'No answer recorded'
                  return (
                    <li key={question.questionId} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-white/8 py-4">
                      <span className="pt-0.5 font-mono text-sm tabular-nums text-white/30" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-amber-200/55">
                          {question.category}
                        </p>
                        <p className="mt-1 text-base font-medium text-white">{question.questionText}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                          <span className="text-emerald-300">
                            <span aria-hidden="true">✓ </span>
                            <span className="sr-only">Correct answer: </span>
                            {correctChoice}
                          </span>
                          <span className="text-rose-300/85">
                            <span aria-hidden="true">✕ </span>
                            <span className="sr-only">Your answer: </span>
                            <span className="line-through decoration-rose-300/50">{selectedChoice}</span>
                          </span>
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <p className="text-4xl" aria-hidden="true">
                  🏆
                </p>
                <p className="mt-3 text-lg font-semibold">Flawless victory</p>
                <p className="mt-1 text-sm text-white/55">No missed questions this time. Keep the streak alive!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
