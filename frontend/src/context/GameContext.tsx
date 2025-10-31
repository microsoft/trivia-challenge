import {
  createContext,
  useContext,
  useState,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { User, GameSession, SessionQuestion } from '../types/api'
import { gameConfig } from '../config/gameConfig'

interface GameState {
  // Player data
  player: User | null
  setPlayer: Dispatch<SetStateAction<User | null>>

  // Session data
  session: GameSession | null
  setSession: Dispatch<SetStateAction<GameSession | null>>

  // Question draw
  questions: SessionQuestion[]
  setQuestions: Dispatch<SetStateAction<SessionQuestion[]>>
  currentQuestionIndex: number
  setCurrentQuestionIndex: Dispatch<SetStateAction<number>>

  // Game state
  isPlaying: boolean
  setIsPlaying: Dispatch<SetStateAction<boolean>>

  // Timer state
  timeLeft: number
  setTimeLeft: Dispatch<SetStateAction<number>>
  maxTime: number
  setMaxTime: Dispatch<SetStateAction<number>>

  // Streak state
  currentStreak: number
  setCurrentStreak: Dispatch<SetStateAction<number>>
  streaksCompleted: number
  setStreaksCompleted: Dispatch<SetStateAction<number>>

  // Score tracking
  score: number
  setScore: Dispatch<SetStateAction<number>>
  questionsAnswered: number
  setQuestionsAnswered: Dispatch<SetStateAction<number>>
  correctAnswers: number
  setCorrectAnswers: Dispatch<SetStateAction<number>>

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
  const [questions, setQuestions] = useState<SessionQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Game state
  const [isPlaying, setIsPlaying] = useState(false)

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(gameConfig.timer.initialSeconds)
  const [maxTime, setMaxTime] = useState<number>(gameConfig.timer.initialSeconds)

  // Streak state
  const [currentStreak, setCurrentStreak] = useState(0)
  const [streaksCompleted, setStreaksCompleted] = useState(0)

  // Score state
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  // Reset game state
  const resetGame = useCallback(() => {
    setQuestions([])
    setCurrentQuestionIndex(0)
    setIsPlaying(false)
  setTimeLeft(gameConfig.timer.initialSeconds)
  setMaxTime(gameConfig.timer.initialSeconds)
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
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
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

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
