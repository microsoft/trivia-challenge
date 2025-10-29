/**
 * Game Context
 * 
 * Global state management for game data, player info, and session
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, GameSession, Question } from '../types/api'

interface GameState {
  // Player data
  player: User | null
  setPlayer: (player: User | null) => void

  // Session data
  session: GameSession | null
  setSession: (session: GameSession | null) => void

  // Current question
  currentQuestion: Question | null
  setCurrentQuestion: (question: Question | null) => void

  // Game state
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void

  // Timer state
  timeLeft: number
  setTimeLeft: (time: number) => void
  maxTime: number
  setMaxTime: (time: number) => void

  // Streak state
  currentStreak: number
  setCurrentStreak: (streak: number) => void
  streaksCompleted: number
  setStreaksCompleted: (count: number) => void

  // Score tracking
  score: number
  setScore: (score: number) => void
  questionsAnswered: number
  setQuestionsAnswered: (count: number) => void
  correctAnswers: number
  setCorrectAnswers: (count: number) => void

  // Reset game state
  resetGame: () => void
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  // Player state
  const [player, setPlayer] = useState<User | null>(null)

  // Session state
  const [session, setSession] = useState<GameSession | null>(null)

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)

  // Game state
  const [isPlaying, setIsPlaying] = useState(false)

  // Timer state
  const [timeLeft, setTimeLeft] = useState(60)
  const [maxTime, setMaxTime] = useState(60)

  // Streak state
  const [currentStreak, setCurrentStreak] = useState(0)
  const [streaksCompleted, setStreaksCompleted] = useState(0)

  // Score state
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  // Reset game state
  const resetGame = useCallback(() => {
    setCurrentQuestion(null)
    setIsPlaying(false)
    setTimeLeft(60)
    setMaxTime(60)
    setCurrentStreak(0)
    setStreaksCompleted(0)
    setScore(0)
    setQuestionsAnswered(0)
    setCorrectAnswers(0)
  }, [])

  const value: GameState = {
    player,
    setPlayer,
    session,
    setSession,
    currentQuestion,
    setCurrentQuestion,
    isPlaying,
    setIsPlaying,
    timeLeft,
    setTimeLeft,
    maxTime,
    setMaxTime,
    currentStreak,
    setCurrentStreak,
    streaksCompleted,
    setStreaksCompleted,
    score,
    setScore,
    questionsAnswered,
    setQuestionsAnswered,
    correctAnswers,
    setCorrectAnswers,
    resetGame,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
