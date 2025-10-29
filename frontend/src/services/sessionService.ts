/**
 * Session Service
 * 
 * Handles all session-related API calls
 */

import { apiClient } from './apiClient'
import { gameConfig } from '../config/gameConfig'
import type {
  ApiResponse,
  SessionCreateRequest,
  GameSession,
  SessionStartResponse,
  QuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from '../types/api'

const { endpoints } = gameConfig.api

export const sessionService = {
  /**
   * Create a new game session
   */
  async create(data: SessionCreateRequest): Promise<ApiResponse<GameSession>> {
    return apiClient.post<ApiResponse<GameSession>>(endpoints.sessions, data)
  },

  /**
   * Start a game session
   */
  async start(sessionId: string): Promise<ApiResponse<SessionStartResponse>> {
    return apiClient.post<ApiResponse<SessionStartResponse>>(
      `${endpoints.sessions}/${sessionId}/start`
    )
  },

  /**
   * Get the next question
   */
  async getNextQuestion(sessionId: string): Promise<ApiResponse<QuestionResponse>> {
    return apiClient.get<ApiResponse<QuestionResponse>>(
      `${endpoints.sessions}/${sessionId}/next-question`
    )
  },

  /**
   * Submit an answer
   */
  async submitAnswer(data: SubmitAnswerRequest): Promise<ApiResponse<SubmitAnswerResponse>> {
    return apiClient.post<ApiResponse<SubmitAnswerResponse>>(
      `${endpoints.sessions}/${data.sessionId}/submit-answer`,
      data
    )
  },

  /**
   * Complete a game session
   */
  async complete(sessionId: string): Promise<ApiResponse<GameSession>> {
    return apiClient.post<ApiResponse<GameSession>>(`${endpoints.sessions}/${sessionId}/complete`)
  },

  /**
   * Get session details
   */
  async get(sessionId: string, userId: string): Promise<ApiResponse<GameSession>> {
    return apiClient.get<ApiResponse<GameSession>>(`${endpoints.sessions}/${sessionId}`, {
      userId,
    })
  },
}
