/**
 * Playing Page
 * 
 * Main gameplay screen with timer, questions, answers, and streak tracking.
 */

import { useEffect, useState } from 'react'
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

export default function PlayingPage() {
  const navigate = useNavigate()
  const {
    currentStreak,
    setCurrentStreak,
    streaksCompleted,
    setStreaksCompleted,
    setTimeLeft,
    setMaxTime,
    correctAnswers,
    setCorrectAnswers,
    questionsAnswered,
    setQuestionsAnswered,
  } = useGame()

  const [showBonusNotification, setShowBonusNotification] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const [showCountdown, setShowCountdown] = useState(true)

  const {
    timeLeft,
    maxTime,
    timerState,
    countdownValue,
    isLowTime,
    startCountdown,
    pauseTimer,
    addBonusTime,
  } = useGameTimer({
    onCountdownComplete: () => {
      setShowCountdown(false)
    },
    onTimeUp: () => {
      // Navigate to results when time runs out
      navigate('/results')
    },
    onBonusAwarded: (bonus) => {
      setBonusAmount(bonus)
      setShowBonusNotification(true)
    },
  })

  // Sync timer values with GameContext
  useEffect(() => {
    setTimeLeft(timeLeft)
    setMaxTime(maxTime)
  }, [timeLeft, maxTime, setTimeLeft, setMaxTime])

  // Start countdown on mount (only once)
  useEffect(() => {
    startCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check for streak completion and award bonus time
  useEffect(() => {
    const newStreaksCompleted = Math.floor(currentStreak / gameConfig.streak.threshold)

    if (newStreaksCompleted > streaksCompleted) {
      setStreaksCompleted(newStreaksCompleted)
      
      // Only award bonus if under max streaks
      if (newStreaksCompleted <= gameConfig.timer.maxStreaks) {
        addBonusTime(newStreaksCompleted)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak])

  // Mock answer handler (will be replaced with actual logic)
  const handleAnswerSelect = (answerIndex: number) => {
    const isCorrect = answerIndex === 0 // Mock: first answer is always correct
    
    setQuestionsAnswered(questionsAnswered + 1)

    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1)
      setCurrentStreak(currentStreak + 1)
    } else {
      // Wrong answer: decrease streak by 1 (not reset)
      const newStreak = Math.max(0, currentStreak - gameConfig.streak.decrementOnWrong)
      setCurrentStreak(newStreak)
      
      // Pause timer for wrong answer modal
      pauseTimer(gameConfig.timer.wrongAnswerPauseSeconds)
      
      // TODO: Show wrong answer modal
    }
  }

  // Calculate current streak progress for visual indicator
  const streakProgress = currentStreak % gameConfig.streak.threshold
  const streakLevel = Math.floor(currentStreak / gameConfig.streak.threshold)

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Timer Bar */}
        <div className="mb-8">
          <TimerBar timeLeft={timeLeft} maxTime={maxTime} isLowTime={isLowTime} />
        </div>

        {/* Streak Indicator */}
        <div className="mb-8">
          <StreakIndicator
            currentStreak={streakProgress}
            streaksCompleted={streakLevel}
          />
        </div>

        {/* Question and Answers - Show during running and paused states */}
        {(timerState === 'running' || timerState === 'paused') && (
          <>
            <QuestionContainer
              questionText="Sample Question: What is Microsoft Fabric?"
              questionNumber={questionsAnswered + 1}
            />
            
            <div className="mt-8">
              <AnswerGrid
                answers={[
                  'A unified analytics platform',
                  'A cloud storage service',
                  'A programming language',
                  'A database management system',
                ]}
                onAnswerSelect={handleAnswerSelect}
                disabled={timerState === 'paused'}
              />
            </div>

            {/* Wrong answer overlay when paused */}
            {timerState === 'paused' && (
              <div className="text-center py-8">
                <p className="text-2xl text-red-500 font-bold">Wrong Answer!</p>
                <p className="text-lg text-gray-400 mt-4">Timer paused...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Countdown Overlay */}
      {showCountdown && timerState === 'countdown' && (
        <CountdownOverlay value={countdownValue} />
      )}

      {/* Bonus Time Notification */}
      <BonusTimeNotification
        bonusSeconds={bonusAmount}
        show={showBonusNotification}
        onAnimationComplete={() => setShowBonusNotification(false)}
      />
    </div>
  )
}
