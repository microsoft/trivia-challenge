/**
 * User Service
 *
 * Handles user registration and related API calls
 */

import { isAxiosError } from 'axios'
import { apiClient } from './apiClient'
import { gameConfig } from '../config/gameConfig'
import type { ApiResponse, RegisterUserRequest, User } from '../types/api'

const { endpoints } = gameConfig.api

export const userService = {
  /**
   * Register a player with the backend
   */
  async register(payload: RegisterUserRequest): Promise<User> {
    try {
      const response = await apiClient.post<ApiResponse<User>>(
        `${endpoints.users}/register`,
        payload
      )

      if (!response.success || !response.data) {
        throw new Error(response.errorMessage ?? 'Registration failed. Please try again.')
      }

      return response.data
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
        console.error('User registration failed', error)
      }

      if (isAxiosError(error)) {
        const apiResponse = error.response?.data as ApiResponse<User> | undefined

        if (apiResponse?.errorMessage) {
          throw new Error(apiResponse.errorMessage)
        }

        if (error.code === 'ERR_NETWORK') {
          throw new Error('Unable to reach the server. Check your connection and try again.')
        }

        throw new Error(error.message || 'Registration failed. Please try again.')
      }

      throw error instanceof Error
        ? error
        : new Error('Registration failed. Please try again.')
    }
  },
}
