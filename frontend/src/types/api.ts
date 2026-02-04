/**
 * API Types
 * 
 * TypeScript definitions for API requests and responses
 */

export interface User {
  userId: string
  email: string
  name: string
  phoneNumber?: string
  country?: string
  state?: string
  createdAt: string
}

export interface RegisterUserRequest {
  email: string
  name: string
  phoneNumber?: string
  country?: string
  state?: string
}

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface GameSession {
  sessionId: string
  userId: string
  seed: number
  questionsUrl: string
  startTime: string
  status: SessionStatus
  totalScore?: number
  questionsAnswered?: number
  correctAnswers?: number
  streaksCompleted?: number
  heartsRemaining?: number
  gameOverReason?: string | null
}

export interface SessionQuestion {
  questionId: string
  questionText: string
  category: string
  choices: string[]
  correctAnswerIndex: number
  metadata?: Record<string, string>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  errorMessage?: string
  statusCode?: number
}

export interface StartSessionResponse {
  sessionId: string
  userId: string
  seed: number
  questionsUrl: string
  startTime: string
  status: SessionStatus
}

export interface SessionQuestionsResponse {
  questions: SessionQuestion[]
}

export interface SubmitAnswerRequest {
  questionId: string
  answerIndex: number
  timeElapsed: number
  isCorrect: boolean
}

export interface SubmitAnswerResponse {
  pointsEarned: number
  totalScore: number
}

export interface EndSessionRequest {
  questionsAnswered: number
  correctAnswers: number
  streaksCompleted: number
  finalTimeRemaining: number
  heartsRemaining: number
  gameOverReason?: string
}

export interface EndSessionResponse {
  sessionId: string
  finalScore: number
  questionsAnswered: number
  correctAnswers: number
  accuracy: number
  streaksCompleted: number
  heartsRemaining: number
  gameOverReason?: string
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
  event: string
  type: string
  timestamp: string
  userId?: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface TelemetryTrackResponse {
  eventId: string
  processedAtUtc: string
  forwarded: boolean
  message?: string
}
