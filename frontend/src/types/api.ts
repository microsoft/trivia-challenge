/**
 * API Types
 * 
 * TypeScript definitions for API requests and responses
 */

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
}

export interface Question {
  id: string
  text: string
  answers: string[]
  correctAnswerIndex: number
  difficulty: 'easy' | 'medium' | 'hard'
  category?: string
}

export interface GameSession {
  sessionId: string
  userId: string
  startTime: string
  endTime?: string
  score: number
  questionsAnswered: number
  correctAnswers: number
  streaksCompleted: number
  timeRemaining: number
  status: 'waiting' | 'playing' | 'completed'
}

export interface AnswerSubmission {
  questionId: string
  answerIndex: number
  timeSpent: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SessionCreateRequest {
  name: string
  email: string
  phone?: string
}

export interface SessionStartResponse {
  sessionId: string
  question: Question
  timeLimit: number
}

export interface QuestionResponse {
  question: Question
  questionNumber: number
  totalQuestions?: number
}

export interface SubmitAnswerRequest {
  sessionId: string
  questionId: string
  answerIndex: number
  timeSpent: number
}

export interface SubmitAnswerResponse {
  correct: boolean
  correctAnswerIndex: number
  points: number
  streak: number
  bonusAwarded: boolean
  nextQuestion?: Question
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  questionsAnswered: number
  correctAnswers: number
  streaksCompleted: number
  date: string
}

export interface TelemetryEvent {
  type: 'click' | 'mousemove' | 'keypress' | 'game_event'
  timestamp: number
  sessionId: string
  data: Record<string, unknown>
}
