import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { User, GameSession, SessionQuestion, QuestionPool } from '../types/api'
import { gameConfig } from '../config/gameConfig'
import { analytics } from '../services/analyticsService'

interface MissedQuestion {
  questionId: string
  questionText: string
  category: string
  choices: string[]
  correctAnswerIndex: number
  selectedAnswerIndex: number
}

interface GameState {
  // Player data
  player: User | null
  setPlayer: Dispatch<SetStateAction<User | null>>

  // Selected question pool
  selectedPool: QuestionPool | null
  setSelectedPool: Dispatch<SetStateAction<QuestionPool | null>>

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

  // Hearts system
  hearts: number
  setHearts: Dispatch<SetStateAction<number>>
  gameOverReason: string | null
  setGameOverReason: Dispatch<SetStateAction<string | null>>

  // Score tracking
  score: number
  setScore: Dispatch<SetStateAction<number>>
  questionsAnswered: number
  setQuestionsAnswered: Dispatch<SetStateAction<number>>
  correctAnswers: number
  setCorrectAnswers: Dispatch<SetStateAction<number>>

  // Missed questions
  missedQuestions: MissedQuestion[]
  setMissedQuestions: Dispatch<SetStateAction<MissedQuestion[]>>

  // Reset game state
  resetGame: () => void
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  // Player state
  const [player, setPlayer] = useState<User | null>(null)

  // Selected pool state
  const [selectedPool, setSelectedPool] = useState<QuestionPool | null>(null)

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

  // Hearts system
  const [hearts, setHearts] = useState<number>(gameConfig.hearts.initialCount)
  const [gameOverReason, setGameOverReason] = useState<string | null>(null)

  // Score state
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestion[]>([])

  // Reset game state
  const resetGame = useCallback(() => {
    setSession(null)
    setQuestions([])
    setCurrentQuestionIndex(0)
    setIsPlaying(false)
    setTimeLeft(gameConfig.timer.initialSeconds)
    setMaxTime(gameConfig.timer.initialSeconds)
    setCurrentStreak(0)
    setStreaksCompleted(0)
  setHearts(gameConfig.hearts.initialCount)
  setGameOverReason(null)
    setScore(0)
    setQuestionsAnswered(0)
    setCorrectAnswers(0)
    setMissedQuestions([])
    analytics.resetTrackedEventCount()
  }, [])

  useEffect(() => {
    analytics.identify(player)
  }, [player])

  useEffect(() => {
    analytics.setSession(session?.sessionId ?? null)
  }, [session])

  useEffect(() => {
    analytics.setPool(selectedPool ? { id: selectedPool.id, name: selectedPool.name } : null)
  }, [selectedPool])

  const value: GameState = {
    player,
    setPlayer,
    selectedPool,
    setSelectedPool,
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
  hearts,
  setHearts,
  gameOverReason,
  setGameOverReason,
    score,
    setScore,
    questionsAnswered,
    setQuestionsAnswered,
    correctAnswers,
    setCorrectAnswers,
    missedQuestions,
    setMissedQuestions,
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
