/**
 * Session Service
 *
 * Handles all session-related API calls
 */

import { isAxiosError } from 'axios'
import { apiClient } from './apiClient'
import { gameConfig } from '../config/gameConfig'
import { ensureStationAccess } from '../lib/stationLockdown'
import type {
  ApiResponse,
  GameSession,
  SessionQuestionsResponse,
  SessionQuestion,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  EndSessionRequest,
  EndSessionResponse,
  QuestionPool,
} from '../types/api'

const { endpoints } = gameConfig.api

function ensureSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.errorMessage ?? 'Session service request failed.')
  }
  return response.data
}

function mapSession(response: StartSessionResponse): GameSession {
  return {
    sessionId: response.sessionId,
    userId: response.userId,
    seed: response.seed,
    poolId: response.poolId,
    questionsUrl: response.questionsUrl,
    startTime: response.startTime,
    status: response.status,
    totalScore: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    streaksCompleted: 0,
    heartsRemaining: gameConfig.hearts.initialCount,
    gameOverReason: null,
  }
}

async function handleRequest<T>(fn: () => Promise<ApiResponse<T>>): Promise<T> {
  try {
    const response = await fn()
    return ensureSuccess(response)
  } catch (error) {
    if (isAxiosError<ApiResponse<T>>(error) && error.response?.data) {
      throw new Error(error.response.data.errorMessage ?? 'Session service request failed.')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Session service request failed.')
  }
}

export const sessionService = {
  /**
   * Get all available question pools
   */
  async getPools(): Promise<QuestionPool[]> {
    ensureStationAccess()
    const data = await handleRequest(() =>
      apiClient.get<ApiResponse<QuestionPool[]>>(`${endpoints.pools}`)
    )
    return data
  },

  /**
   * Start a new session for the specified user
   * @param userId The user ID
   * @param poolId Optional pool ID (defaults to "default" if not provided)
   */
  async start(userId: string, poolId?: string): Promise<GameSession> {
    ensureStationAccess()
    const payload: { userId: string; poolId?: string } = { userId }
    if (poolId) {
      payload.poolId = poolId
    }
    const data = await handleRequest(() =>
      apiClient.post<ApiResponse<StartSessionResponse>>(`${endpoints.sessions}/start`, payload)
    )
    return mapSession(data)
  },

  /**
   * Retrieve all questions for a session
   */
  async getQuestions(sessionId: string): Promise<SessionQuestion[]> {
    ensureStationAccess()
    const data = await handleRequest(() =>
      apiClient.get<ApiResponse<SessionQuestionsResponse>>(
        `${endpoints.sessions}/${sessionId}/questions`
      )
    )
    return data.questions
  },

  /**
   * Submit an answer for the active session
   */
  async submitAnswer(sessionId: string, payload: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    ensureStationAccess()
    return handleRequest(() =>
      apiClient.post<ApiResponse<SubmitAnswerResponse>>(
        `${endpoints.sessions}/${sessionId}/answers`,
        payload
      )
    )
  },

  /**
   * End the current session and retrieve summary results
   */
  async end(sessionId: string, payload: EndSessionRequest): Promise<EndSessionResponse> {
    ensureStationAccess()
    return handleRequest(() =>
      apiClient.post<ApiResponse<EndSessionResponse>>(
        `${endpoints.sessions}/${sessionId}/end`,
        payload
      )
    )
  },
}
