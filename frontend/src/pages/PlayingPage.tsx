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
import GameHeader from '../components/GameHeader'
import CountdownOverlay from '../components/CountdownOverlay'
import BonusTimeNotification from '../components/BonusTimeNotification'
import QuestionContainer from '../components/QuestionContainer'
import AnswerGrid from '../components/AnswerGrid'
import { gameConfig } from '../config/gameConfig'
import { sessionService } from '../services/sessionService'
import { analytics } from '../services/analyticsService'
import { getStationLockdownMessage, isStationLockdownActive } from '../lib/stationLockdown'

function PlayingPageBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" />
      <div className="absolute -top-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-28 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl" />
    </div>
  )
}

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
    hearts,
    setHearts,
  gameOverReason,
    setScore,
    questionsAnswered,
    setQuestionsAnswered,
    correctAnswers,
    setCorrectAnswers,
    setMissedQuestions,
    setGameOverReason,
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
  const lockdownMessage = getStationLockdownMessage()

  const wrongAnswerTimeoutRef = useRef<number | null>(null)
  const pauseAnimationFrameRef = useRef<number | null>(null)
  const sessionEndedRef = useRef(false)
  const countdownStartedRef = useRef(false)
  const onTimeUpRef = useRef<() => void>(() => {})
  const metricsRef = useRef({
    questionsAnswered,
    correctAnswers,
    streaksCompleted,
    heartsRemaining: hearts,
  })
  const isMountedRef = useRef(true)
  const questionDisplayTimeRef = useRef<number>(0)
  const pauseAutoHandledRef = useRef(false)

  useEffect(() => {
    metricsRef.current = {
      questionsAnswered,
      correctAnswers,
      streaksCompleted,
      heartsRemaining: hearts,
    }
  }, [questionsAnswered, correctAnswers, streaksCompleted, hearts])

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

  // Record precise timing when a new question is displayed
  useEffect(() => {
    if (currentQuestion) {
      questionDisplayTimeRef.current = performance.now()
    }
  }, [currentQuestionIndex, currentQuestion])

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

    if (isStationLockdownActive()) {
      setLoading(false)
      setError(lockdownMessage)
      setIsPlaying(false)
      analytics.track(
        'game.lockdownblocked',
        {},
        {
          page: 'playing',
        }
      )
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
      setHearts(gameConfig.hearts.initialCount)
      setGameOverReason(null)
      setMissedQuestions([])
      setShowPauseMessage(false)
      setIsSubmitting(false)
      metricsRef.current = {
        questionsAnswered: 0,
        correctAnswers: 0,
        streaksCompleted: 0,
        heartsRemaining: gameConfig.hearts.initialCount,
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
          heartsRemaining: gameConfig.hearts.initialCount,
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
  }, [player, setSession, setQuestions, setCurrentQuestionIndex, setQuestionsAnswered, setCorrectAnswers, setScore, setCurrentStreak, setStreaksCompleted, setHearts, setGameOverReason, setIsPlaying, setMissedQuestions, startCountdown, lockdownMessage])

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
      heartsRemaining?: number
      gameOverReason?: string | null
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
      heartsRemaining: overrides?.heartsRemaining ?? metricsRef.current.heartsRemaining,
      gameOverReason: overrides?.gameOverReason ?? gameOverReason ?? undefined,
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
          heartsRemaining: summary.heartsRemaining,
          gameOverReason: summary.gameOverReason ?? undefined,
          apiSuccess,
        },
        {
          page: 'results',
        }
      )
      setIsPlaying(false)
      navigate('/results', { replace: true })
    }
  }, [session, timeLeft, gameOverReason, setIsPlaying, navigate])

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

  const handleSkipPause = useCallback(() => {
    if (pauseAutoHandledRef.current) {
      return
    }

    pauseAutoHandledRef.current = true
    setShowPauseMessage(false)
    resumeTimer()
    handleQuestionProgress()
  }, [resumeTimer, handleQuestionProgress])

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (!session || !currentQuestion || isSubmitting || timerState !== 'running') {
      return
    }

    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex
    // Record precise timing when answer is submitted and compute difference in milliseconds
    const answerTime = performance.now()
    const responseTimeMs = answerTime - questionDisplayTimeRef.current
    const timeElapsed = responseTimeMs / 1000 // Convert to seconds for backend API
    const sessionId = session.sessionId
    const questionId = currentQuestion.questionId
    const remainingTimeSeconds = timeLeft
    const questionNumber = currentQuestionIndex + 1

    const heartPenalty = isCorrect ? 0 : gameConfig.hearts.decrementOnWrong
    const minimumHearts = gameConfig.hearts.minimum
    const rawNextHearts = isCorrect ? hearts : hearts - heartPenalty
    const heartsAfterAnswer = isCorrect
      ? hearts
      : Math.max(minimumHearts, Math.round(rawNextHearts * 2) / 2)
    const heartsDepleted = !isCorrect && heartsAfterAnswer <= minimumHearts

    if (!isCorrect && heartsAfterAnswer !== hearts) {
      setHearts(heartsAfterAnswer)
    }

    if (heartsDepleted) {
      setGameOverReason(prev => prev ?? 'hearts.depleted')
    }

    setIsSubmitting(true)
    setError(null)

    const baseTelemetry = {
      sessionId,
      questionId,
      category: currentQuestion.category,
      answerIndex,
      isCorrect,
      responseTime: responseTimeMs,
      remainingTimeSeconds,
      questionNumber,
      heartsRemaining: heartsAfterAnswer,
    }

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
            ...baseTelemetry,
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
            ...baseTelemetry,
            apiSuccess: false,
            error: message,
          },
          {
            page: 'playing',
          }
        )
      })

    const streakThreshold = gameConfig.streak.threshold
    const streakDecrement = gameConfig.streak.decrementOnWrong
    const maxAwardableStreaks = gameConfig.timer.maxStreaks

    const updatedQuestionsAnswered = metricsRef.current.questionsAnswered + 1
    const updatedCorrectAnswers = isCorrect
      ? metricsRef.current.correctAnswers + 1
      : metricsRef.current.correctAnswers

    let updatedStreakProgress = currentStreak
    let updatedStreaksCompleted = metricsRef.current.streaksCompleted
    let awardedStreakLevel: number | null = null
    let streakProgressBeforeReset: number | null = null

    if (isCorrect) {
      const tentativeProgress = currentStreak + 1

      if (tentativeProgress >= streakThreshold) {
        const nextCompletedTotal = Math.min(updatedStreaksCompleted + 1, maxAwardableStreaks)

        if (nextCompletedTotal > updatedStreaksCompleted) {
          updatedStreaksCompleted = nextCompletedTotal
          setStreaksCompleted(nextCompletedTotal)
          awardedStreakLevel = nextCompletedTotal
          streakProgressBeforeReset = tentativeProgress
        }

        updatedStreakProgress = tentativeProgress - streakThreshold
      } else {
        updatedStreakProgress = tentativeProgress
      }
    } else {
      updatedStreakProgress = Math.max(0, currentStreak - streakDecrement)
    }

    setQuestionsAnswered(updatedQuestionsAnswered)
    setCorrectAnswers(updatedCorrectAnswers)
    setCurrentStreak(updatedStreakProgress)

    metricsRef.current = {
      questionsAnswered: updatedQuestionsAnswered,
      correctAnswers: updatedCorrectAnswers,
      streaksCompleted: updatedStreaksCompleted,
      heartsRemaining: heartsAfterAnswer,
    }

    if (isCorrect) {
      if (awardedStreakLevel !== null) {
        addBonusTime(awardedStreakLevel)
        analytics.track(
          'game.streakcompleted',
          {
            sessionId,
            streakLevel: awardedStreakLevel,
            currentStreak: streakProgressBeforeReset ?? streakThreshold,
            streakProgressAfterReset: updatedStreakProgress,
            heartsRemaining: heartsAfterAnswer,
          },
          {
            page: 'playing',
          }
        )
      }

      const nextIndex = currentQuestionIndex + 1
      if (nextIndex >= questions.length) {
        setIsSubmitting(false)
        handleSessionEnd({
          questionsAnswered: updatedQuestionsAnswered,
          correctAnswers: updatedCorrectAnswers,
          streaksCompleted: updatedStreaksCompleted,
          finalTimeRemaining: timeLeft,
          heartsRemaining: heartsAfterAnswer,
        })
        return
      }

      setCurrentQuestionIndex(nextIndex)
      setIsSubmitting(false)
      return
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

    if (heartsDepleted) {
      setShowPauseMessage(false)
      setIsSubmitting(false)
      handleSessionEnd({
        questionsAnswered: updatedQuestionsAnswered,
        correctAnswers: updatedCorrectAnswers,
        streaksCompleted: updatedStreaksCompleted,
        finalTimeRemaining: timeLeft,
        heartsRemaining: heartsAfterAnswer,
        gameOverReason: 'hearts.depleted',
      })
      return
    }

    setPauseFeedback({
      selectedIndex: answerIndex,
      correctIndex: currentQuestion.correctAnswerIndex,
    })
    setPauseProgress(0)
    pauseAutoHandledRef.current = false
    setShowPauseMessage(true)
    pauseTimer(gameConfig.timer.wrongAnswerPauseSeconds)

    if (wrongAnswerTimeoutRef.current) {
      window.clearTimeout(wrongAnswerTimeoutRef.current)
    }

    wrongAnswerTimeoutRef.current = window.setTimeout(() => {
      handleSkipPause()
    }, gameConfig.timer.wrongAnswerPauseSeconds * 1000)
  }, [
    session,
    currentQuestion,
    isSubmitting,
    timerState,
    timeLeft,
    hearts,
    setHearts,
    setGameOverReason,
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
    setCurrentQuestionIndex,
    setMissedQuestions,
    handleSkipPause,
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
      if (showPauseMessage) {
        if (event.code === 'Space' || event.key === ' ') {
          event.preventDefault()
          handleSkipPause()
        }
        return
      }

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
  }, [
    showPauseMessage,
    handleSkipPause,
    timerState,
    isSubmitting,
    currentQuestion,
    keyToAnswerIndex,
    handleAnswerSelect,
  ])

  useEffect(() => {
    if (!showPauseMessage) {
      return
    }

    if (pauseProgress >= 1) {
      handleSkipPause()
    }
  }, [showPauseMessage, pauseProgress, handleSkipPause])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
        <PlayingPageBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header userName={player?.name} />
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-lg text-white/70" role="status" aria-live="polite">
              Preparing your challenge...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
        <PlayingPageBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
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
    <div className="relative min-h-screen overflow-hidden bg-[#040406] text-white">
      <PlayingPageBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header userName={player?.name} />

        <div className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8" aria-live="polite" aria-label="Game progress">
              <GameHeader
                timeLeft={timeLeft}
                maxTime={maxTime}
                isLowTime={isLowTime}
                currentProgress={streakProgress}
                streaksCompleted={completedStreaksDisplay}
                questionsAnswered={questionsAnswered}
                totalQuestions={questions.length}
                correctAnswers={correctAnswers}
                heartsRemaining={hearts}
                maxHearts={gameConfig.hearts.initialCount}
              />
            </div>

            {(timerState === 'running' || timerState === 'paused') && (
              <>
                <QuestionContainer
                  questionText={currentQuestion.questionText}
                  questionNumber={currentQuestionIndex + 1}
                  category={currentQuestion.category}
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
                      <button
                        type="button"
                        onClick={handleSkipPause}
                        className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        Skip wait · Space
                      </button>
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
        </div>
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
