/**
 * API Client
 * 
 * Centralized HTTP client for all API communications
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { gameConfig } from '../config/gameConfig'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: gameConfig.api.baseUrl,
      timeout: gameConfig.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
          console.log('API Request:', config.method?.toUpperCase(), config.url)
        }
        return config
      },
      error => {
        console.error('API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      response => {
        if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
          console.log('API Response:', response.status, response.data)
        }
        return response
      },
      (error: AxiosError) => {
        console.error('API Response Error:', error.response?.status, error.message)
        return Promise.reject(error)
      }
    )
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>) {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown) {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown) {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string) {
    const response = await this.client.delete<T>(url)
    return response.data
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
