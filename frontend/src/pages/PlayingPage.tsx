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
  } = useGame()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBonusNotification, setShowBonusNotification] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPauseMessage, setShowPauseMessage] = useState(false)

  const wrongAnswerTimeoutRef = useRef<number | null>(null)
  const sessionEndedRef = useRef(false)
  const countdownStartedRef = useRef(false)
  const onTimeUpRef = useRef<() => void>(() => {})
  const metricsRef = useRef({
    questionsAnswered,
    correctAnswers,
    streaksCompleted,
  })

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

  useEffect(() => {
    setTimeLeft(timeLeft)
    setMaxTime(maxTime)
  }, [timeLeft, maxTime, setTimeLeft, setMaxTime])

  useEffect(() => {
    return () => {
      if (wrongAnswerTimeoutRef.current) {
        window.clearTimeout(wrongAnswerTimeoutRef.current)
      }
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
  }, [player, setSession, setQuestions, setCurrentQuestionIndex, setQuestionsAnswered, setCorrectAnswers, setScore, setCurrentStreak, setStreaksCompleted, setIsPlaying, startCountdown])

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
  }, [currentQuestionIndex, questions.length, handleSessionEnd, setCurrentQuestionIndex, timeLeft])

  const handleQuestionProgress = useCallback(() => {
    if (wrongAnswerTimeoutRef.current) {
      window.clearTimeout(wrongAnswerTimeoutRef.current)
      wrongAnswerTimeoutRef.current = null
    }
    goToNextQuestion()
    setIsSubmitting(false)
  }, [goToNextQuestion])

  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (!session || !currentQuestion || isSubmitting || timerState !== 'running') {
      return
    }

    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex
    const timeElapsed = maxTime - timeLeft

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await sessionService.submitAnswer(session.sessionId, {
        questionId: currentQuestion.questionId,
        answerIndex,
        timeElapsed,
        isCorrect,
      })

      setScore(response.totalScore)

      analytics.track(
        'game.answerquestion',
        {
          sessionId: session.sessionId,
          questionId: currentQuestion.questionId,
          answerIndex,
          isCorrect,
          responseTime: timeElapsed,
          totalScore: response.totalScore,
        },
        {
          page: 'playing',
        }
      )

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
                sessionId: session.sessionId,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer. Please try again.'
      setError(message)
      setIsSubmitting(false)
    }
  }, [
    session,
    currentQuestion,
    isSubmitting,
    timerState,
    maxTime,
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
  ])

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
        <Header />
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
        <Header />
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

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
              <AnswerGrid
                answers={currentQuestion.choices}
                onAnswerSelect={handleAnswerSelect}
                disabled={isSubmitting || timerState !== 'running'}
                keyLabels={answerKeyLabels}
              />
            </div>

            {showPauseMessage && (
              <div
                className="mt-10 text-center"
                role="status"
                aria-live="assertive"
              >
                <p className="text-2xl font-bold text-red-500">Wrong Answer!</p>
                <p className="mt-4 text-lg text-white/70">Timer paused... Take a breath.</p>
              </div>
            )}
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
