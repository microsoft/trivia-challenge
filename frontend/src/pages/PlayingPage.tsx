import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useGameTimer } from '../hooks/useGameTimer'
import Header from '../components/Header'
import TimerBar from '../components/TimerBar'
import CountdownOverlay from '../components/CountdownOverlay'
import BonusTimeNotification from '../components/BonusTimeNotification'
import QuestionContainer from '../components/QuestionContainer'
import AnswerGrid from '../components/AnswerGrid'
import StreakIndicator from '../components/StreakIndicator'
import { gameConfig } from '../config/gameConfig'
import { sessionService } from '../services/sessionService'
import { analytics } from '../services/analyticsService'

export default function PlayingPage() {
  const navigate = useNavigate()
  const {
    player,
    session,
    setSession,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    setIsPlaying,
    setTimeLeft,
    setMaxTime,
    currentStreak,
    setCurrentStreak,
    streaksCompleted,
    setStreaksCompleted,
    setScore,
    questionsAnswered,
    setQuestionsAnswered,
    correctAnswers,
    setCorrectAnswers,
    setMissedQuestions,
  } = useGame()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBonusNotification, setShowBonusNotification] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPauseMessage, setShowPauseMessage] = useState(false)
  const [pauseFeedback, setPauseFeedback] = useState<{
    selectedIndex: number
    correctIndex: number
  } | null>(null)
  const [pauseProgress, setPauseProgress] = useState(0)

  const wrongAnswerTimeoutRef = useRef<number | null>(null)
  const pauseAnimationFrameRef = useRef<number | null>(null)
  const sessionEndedRef = useRef(false)
  const countdownStartedRef = useRef(false)
  const onTimeUpRef = useRef<() => void>(() => {})
  const metricsRef = useRef({
    questionsAnswered,
    correctAnswers,
    streaksCompleted,
  })
  const isMountedRef = useRef(true)
  const questionDisplayTimeRef = useRef<number>(0)

  useEffect(() => {
    metricsRef.current = {
      questionsAnswered,
      correctAnswers,
      streaksCompleted,
    }
  }, [questionsAnswered, correctAnswers, streaksCompleted])

  const {
    timeLeft,
    maxTime,
    timerState,
    countdownValue,
    isLowTime,
    startCountdown,
    pauseTimer,
    resumeTimer,
    addBonusTime,
  } = useGameTimer({
    onCountdownComplete: () => {
      setShowCountdown(false)
    },
    onTimeUp: () => {
      onTimeUpRef.current()
    },
    onBonusAwarded: (bonus) => {
      setBonusAmount(bonus)
      setShowBonusNotification(true)
    },
  })

  const currentQuestion = questions[currentQuestionIndex]

  const answerKeyLabels = useMemo(() => {
    const labelMap = new Array<string>(gameConfig.questions.answersPerQuestion).fill('')
    Object.entries(gameConfig.keyboard.mappings).forEach(([key, index]) => {
      if (!labelMap[index]) {
        labelMap[index] = key.toUpperCase()
      }
    })
    return labelMap
  }, [])

  const keyToAnswerIndex = useMemo(() => {
    const entries = Object.entries(gameConfig.keyboard.mappings)
    return new Map(entries.map(([key, index]) => [key.toUpperCase(), index]))
  }, [])

  const pauseGradientId = useMemo(
    () => `pause-progress-${Math.random().toString(36).slice(2, 8)}`,
    []
  )

  useEffect(() => {
    setTimeLeft(timeLeft)
    setMaxTime(maxTime)
  }, [timeLeft, maxTime, setTimeLeft, setMaxTime])

  // Track when the current question is displayed to the user
  useEffect(() => {
    if (timerState === 'running' && currentQuestion) {
      questionDisplayTimeRef.current = performance.now()
    }
  }, [timerState, currentQuestionIndex, currentQuestion])

  useEffect(() => {
    return () => {
      if (wrongAnswerTimeoutRef.current) {
        window.clearTimeout(wrongAnswerTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const initializeGame = useCallback(async () => {
    if (!player) {
      return
    }

    setLoading(true)
    setError(null)
    sessionEndedRef.current = false
    countdownStartedRef.current = false

    try {
      const newSession = await sessionService.start(player.userId)
      setSession(newSession)

      const fetchedQuestions = await sessionService.getQuestions(newSession.sessionId)

      if (!fetchedQuestions.length) {
        throw new Error('No questions available. Please try again later.')
      }

      setQuestions(fetchedQuestions)
      setCurrentQuestionIndex(0)
      setQuestionsAnswered(0)
      setCorrectAnswers(0)
      setScore(0)
      setCurrentStreak(0)
      setStreaksCompleted(0)
      setMissedQuestions([])
      setShowPauseMessage(false)
      setIsSubmitting(false)
      metricsRef.current = {
        questionsAnswered: 0,
        correctAnswers: 0,
        streaksCompleted: 0,
      }
      setIsPlaying(true)
      setShowCountdown(true)

      if (!countdownStartedRef.current) {
        countdownStartedRef.current = true
        startCountdown()
      }

      analytics.resetTrackedEventCount()

      analytics.track(
        'game.start',
        {
          sessionId: newSession.sessionId,
          questionCount: fetchedQuestions.length,
        },
        {
          page: 'playing',
        }
      )

      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start the game. Please try again.'
      setError(message)
      setLoading(false)
    }
  }, [player, setSession, setQuestions, setCurrentQuestionIndex, setQuestionsAnswered, setCorrectAnswers, setScore, setCurrentStreak, setStreaksCompleted, setIsPlaying, setMissedQuestions, startCountdown])

  useEffect(() => {
    if (!player) {
      navigate('/signin', { replace: true })
      return
    }

    initializeGame()
  }, [player, initializeGame, navigate])

  const handleSessionEnd = useCallback(async (
    overrides?: {
      questionsAnswered?: number
      correctAnswers?: number
      streaksCompleted?: number
      finalTimeRemaining?: number
    }
  ) => {
    if (sessionEndedRef.current || !session) {
      navigate('/results', { replace: true })
      return
    }

    sessionEndedRef.current = true

    const summary = {
      questionsAnswered: overrides?.questionsAnswered ?? metricsRef.current.questionsAnswered,
      correctAnswers: overrides?.correctAnswers ?? metricsRef.current.correctAnswers,
      streaksCompleted: overrides?.streaksCompleted ?? metricsRef.current.streaksCompleted,
      finalTimeRemaining: overrides?.finalTimeRemaining ?? timeLeft,
    }

    let apiSuccess = true
    try {
      await sessionService.end(session.sessionId, summary)
    } catch (err) {
      apiSuccess = false
      console.error('Failed to end session', err)
    } finally {
      analytics.track(
        'game.ended',
        {
          sessionId: session.sessionId,
          questionsAnswered: summary.questionsAnswered,
          correctAnswers: summary.correctAnswers,
          streaksCompleted: summary.streaksCompleted,
          timeRemaining: summary.finalTimeRemaining,
          apiSuccess,
        },
        {
          page: 'results',
        }
      )
      setIsPlaying(false)
      navigate('/results', { replace: true })
    }
  }, [session, timeLeft, setIsPlaying, navigate])

  useEffect(() => {
    onTimeUpRef.current = () => {
      handleSessionEnd()
    }
  }, [handleSessionEnd])

  const goToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex >= questions.length) {
      handleSessionEnd({
        questionsAnswered: metricsRef.current.questionsAnswered,
        correctAnswers: metricsRef.current.correctAnswers,
        streaksCompleted: metricsRef.current.streaksCompleted,
        finalTimeRemaining: timeLeft,
      })
      return
    }
    setCurrentQuestionIndex(nextIndex)
    // The questionDisplayTimeRef will be updated by the effect when the new question renders
  }, [currentQuestionIndex, questions.length, handleSessionEnd, setCurrentQuestionIndex, timeLeft])

  const handleQuestionProgress = useCallback(() => {
    if (wrongAnswerTimeoutRef.current) {
      window.clearTimeout(wrongAnswerTimeoutRef.current)
      wrongAnswerTimeoutRef.current = null
    }
    const animationFrameId = pauseAnimationFrameRef.current
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId)
      pauseAnimationFrameRef.current = null
    }
    setPauseFeedback(null)
    setPauseProgress(0)
    goToNextQuestion()
    setIsSubmitting(false)
  }, [goToNextQuestion])

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (!session || !currentQuestion || isSubmitting || timerState !== 'running') {
      return
    }

    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex
    // Calculate response time as the time taken to answer this specific question
    const responseTimeMs = performance.now() - questionDisplayTimeRef.current
    const timeElapsed = responseTimeMs / 1000 // Convert to seconds
    const sessionId = session.sessionId
    const questionId = currentQuestion.questionId

    setIsSubmitting(true)
    setError(null)

    void sessionService
      .submitAnswer(sessionId, {
        questionId,
        answerIndex,
        timeElapsed,
        isCorrect,
      })
      .then(response => {
        if (isMountedRef.current) {
          setScore(response.totalScore)
        }

        analytics.track(
          'game.answerquestion',
          {
            sessionId,
            questionId,
            category: currentQuestion.category,
            answerIndex,
            isCorrect,
            responseTime: timeElapsed,
            totalScore: response.totalScore,
            apiSuccess: true,
          },
          {
            page: 'playing',
          }
        )
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : 'Failed to submit answer. Please try again.'
        console.error('Failed to submit answer', err)

        analytics.track(
          'game.answerquestion',
          {
            sessionId,
            questionId,
            category: currentQuestion.category,
            answerIndex,
            isCorrect,
            responseTime: timeElapsed,
            apiSuccess: false,
            error: message,
          },
          {
            page: 'playing',
          }
        )
      })

    const updatedQuestionsAnswered = metricsRef.current.questionsAnswered + 1
    const updatedCorrectAnswers = isCorrect
      ? metricsRef.current.correctAnswers + 1
      : metricsRef.current.correctAnswers
    const updatedStreak = isCorrect
      ? currentStreak + 1
      : Math.max(0, currentStreak - gameConfig.streak.decrementOnWrong)

    let updatedStreaksCompleted = metricsRef.current.streaksCompleted

    setQuestionsAnswered(updatedQuestionsAnswered)
    setCorrectAnswers(updatedCorrectAnswers)
    setCurrentStreak(updatedStreak)

    if (isCorrect) {
      const rawCompleted = Math.floor(updatedStreak / gameConfig.streak.threshold)
      const cappedCompleted = Math.min(rawCompleted, gameConfig.timer.maxStreaks)

      if (cappedCompleted > updatedStreaksCompleted) {
        updatedStreaksCompleted = cappedCompleted
        setStreaksCompleted(cappedCompleted)

        if (rawCompleted <= gameConfig.timer.maxStreaks) {
          addBonusTime(rawCompleted)
          analytics.track(
            'game.streakcompleted',
            {
              sessionId,
              streakLevel: cappedCompleted,
              currentStreak: updatedStreak,
            },
            {
              page: 'playing',
            }
          )
        }
      }

      metricsRef.current = {
        questionsAnswered: updatedQuestionsAnswered,
        correctAnswers: updatedCorrectAnswers,
        streaksCompleted: updatedStreaksCompleted,
      }

      const nextIndex = currentQuestionIndex + 1
      if (nextIndex >= questions.length) {
        setIsSubmitting(false)
        handleSessionEnd({
          questionsAnswered: updatedQuestionsAnswered,
          correctAnswers: updatedCorrectAnswers,
          streaksCompleted: updatedStreaksCompleted,
          finalTimeRemaining: timeLeft,
        })
        return
      }

      setCurrentQuestionIndex(nextIndex)
      setIsSubmitting(false)
      return
    }

    metricsRef.current = {
      questionsAnswered: updatedQuestionsAnswered,
      correctAnswers: updatedCorrectAnswers,
      streaksCompleted: updatedStreaksCompleted,
    }

    setMissedQuestions(prev => {
      const alreadyTracked = prev.some(item => item.questionId === currentQuestion.questionId)
      if (alreadyTracked) {
        return prev
      }
      return [
        ...prev,
        {
          questionId: currentQuestion.questionId,
          questionText: currentQuestion.questionText,
          category: currentQuestion.category,
          choices: currentQuestion.choices,
          correctAnswerIndex: currentQuestion.correctAnswerIndex,
          selectedAnswerIndex: answerIndex,
        },
      ]
    })

    setPauseFeedback({
      selectedIndex: answerIndex,
      correctIndex: currentQuestion.correctAnswerIndex,
    })
    setPauseProgress(0)
    setShowPauseMessage(true)
    pauseTimer(gameConfig.timer.wrongAnswerPauseSeconds)

    if (wrongAnswerTimeoutRef.current) {
      window.clearTimeout(wrongAnswerTimeoutRef.current)
    }

    wrongAnswerTimeoutRef.current = window.setTimeout(() => {
      setShowPauseMessage(false)
      resumeTimer()
      handleQuestionProgress()
    }, gameConfig.timer.wrongAnswerPauseSeconds * 1000)
  }, [
    session,
    currentQuestion,
    isSubmitting,
    timerState,
    timeLeft,
    setScore,
    currentStreak,
    setCurrentStreak,
    setQuestionsAnswered,
    setCorrectAnswers,
    setStreaksCompleted,
    addBonusTime,
    currentQuestionIndex,
    questions.length,
    handleSessionEnd,
    pauseTimer,
    resumeTimer,
    handleQuestionProgress,
    setCurrentQuestionIndex,
    setMissedQuestions,
  ])

  useEffect(() => {
    if (!showPauseMessage) {
      const animationFrameId = pauseAnimationFrameRef.current
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
        pauseAnimationFrameRef.current = null
      }
      setPauseProgress(0)
      return
    }

    const durationMs = gameConfig.timer.wrongAnswerPauseSeconds * 1000
    const start = performance.now()

    const step = () => {
      const elapsed = performance.now() - start
      const nextProgress = Math.min(elapsed / durationMs, 1)

      if (isMountedRef.current) {
        setPauseProgress(nextProgress)
      }

      if (nextProgress < 1) {
        pauseAnimationFrameRef.current = window.requestAnimationFrame(step)
      } else {
        pauseAnimationFrameRef.current = null
      }
    }

    pauseAnimationFrameRef.current = window.requestAnimationFrame(step)

    return () => {
      const animationFrameId = pauseAnimationFrameRef.current
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
        pauseAnimationFrameRef.current = null
      }
    }
  }, [showPauseMessage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (timerState !== 'running' || isSubmitting || !currentQuestion) {
        return
      }

      const key = event.key.toUpperCase()
      const mappedIndex = keyToAnswerIndex.get(key)

      if (mappedIndex === undefined) {
        return
      }

      event.preventDefault()
      handleAnswerSelect(mappedIndex)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyToAnswerIndex, handleAnswerSelect, timerState, isSubmitting, currentQuestion])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header userName={player?.name} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-lg text-white/70" role="status" aria-live="polite">
            Preparing your challenge...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header userName={player?.name} />
        <div className="flex flex-1 flex-col items-center justify-center space-y-6 px-6 text-center">
          <p className="text-xl font-semibold text-red-400" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => navigate('/instructions', { replace: true })}
            className="rounded-2xl bg-amber-400 px-6 py-3 font-semibold text-black shadow-lg transition hover:brightness-110"
          >
            Return to Instructions
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return null
  }

  const streakProgress = currentStreak % gameConfig.streak.threshold
  const completedStreaksDisplay = Math.min(streaksCompleted, gameConfig.timer.maxStreaks)
  const pauseDurationSeconds = gameConfig.timer.wrongAnswerPauseSeconds
  const pauseCircleRadius = 54
  const pauseCircumference = 2 * Math.PI * pauseCircleRadius
  const pauseSecondsRemaining = Math.max(0, Math.ceil((1 - pauseProgress) * pauseDurationSeconds))

  return (
    <div className="min-h-screen bg-black text-white">
      <Header userName={player?.name} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8" aria-live="polite" aria-label="Time remaining">
          <TimerBar timeLeft={timeLeft} maxTime={maxTime} isLowTime={isLowTime} />
        </div>

        <div className="mb-8" aria-live="polite" aria-label="Current streak">
          <StreakIndicator
            currentProgress={streakProgress}
            streaksCompleted={completedStreaksDisplay}
          />
        </div>

        {(timerState === 'running' || timerState === 'paused') && (
          <>
            <QuestionContainer
              questionText={currentQuestion.questionText}
              questionNumber={currentQuestionIndex + 1}
            />

            <div className="mt-8">
              {showPauseMessage && pauseFeedback ? (
                <div
                  className="flex flex-col items-center gap-6"
                  role="status"
                  aria-live="assertive"
                >
                  <p className="text-2xl font-bold text-white">Let&apos;s review that one.</p>
                  <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-red-600/90 p-6 shadow-lg shadow-red-600/40">
                      <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Your answer</p>
                      <p className="mt-3 text-xl font-semibold text-white">
                        {currentQuestion.choices[pauseFeedback.selectedIndex] ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-emerald-600/90 p-6 shadow-lg shadow-emerald-600/40">
                      <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Correct answer</p>
                      <p className="mt-3 text-xl font-semibold text-white">
                        {currentQuestion.choices[pauseFeedback.correctIndex] ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-white/80">
                    <div className="relative h-14 w-14">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                        <defs>
                          <linearGradient id={pauseGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="60"
                          cy="60"
                          r={pauseCircleRadius}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={pauseCircleRadius}
                          stroke={`url(#${pauseGradientId})`}
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={pauseCircumference}
                          strokeDashoffset={(1 - pauseProgress) * pauseCircumference}
                          fill="none"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">
                        {pauseSecondsRemaining}
                      </span>
                    </div>
                    <p className="text-lg font-medium">Next question loading...</p>
                  </div>
                </div>
              ) : (
                <AnswerGrid
                  answers={currentQuestion.choices}
                  onAnswerSelect={handleAnswerSelect}
                  disabled={isSubmitting || timerState !== 'running'}
                  keyLabels={answerKeyLabels}
                />
              )}
            </div>
          </>
        )}
      </div>

      {showCountdown && timerState === 'countdown' && <CountdownOverlay value={countdownValue} />}

      <BonusTimeNotification
        bonusSeconds={bonusAmount}
        show={showBonusNotification}
        onAnimationComplete={() => setShowBonusNotification(false)}
      />
    </div>
  )
}
