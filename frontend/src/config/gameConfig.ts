/**
 * Game Configuration
 * 
 * This file contains all configurable settings for the Microsoft Fabric IQ Challenge game.
 * Modify these values to adjust game behavior without changing core logic.
 */

export const gameConfig = {
  /**
   * Timer Settings
   */
  timer: {
    initialSeconds: 60, // Base game time in seconds
    countdownSeconds: 3, // Countdown before game starts
    bonusSeconds: 10, // Bonus time awarded for streak completion
    maxStreaks: 4, // Maximum number of streaks that award bonus time
    wrongAnswerPauseSeconds: 5, // Time to display wrong answer modal
    lowTimeThreshold: 5, // Seconds remaining to trigger red timer warning
  },

  /**
   * Streak System
   */
  streak: {
    threshold: 5, // Number of correct answers to complete a streak
    decrementOnWrong: 1, // How much to decrease streak on wrong answer
    visualIndicators: 5, // Number of flask indicators to show
  },

  /**
   * Scoring
   */
  scoring: {
    pointsPerCorrectAnswer: 10, // Simplified: 10 points per correct answer
    // Note: Difficulty levels below are for categorization only, not scoring
    difficulty: {
      easy: 10,
      medium: 10,
      hard: 10,
    },
  },

  /**
   * Keyboard Mappings
   * 
   * Configure which keys correspond to which answer choices.
   * Common layouts:
   * - Layout 1 (AKSL): { A: 0, K: 1, S: 2, L: 3 }
   * - Layout 2 (ZCBM): { Z: 0, C: 1, B: 2, M: 3 }
   * - Layout 3 (1234): { '1': 0, '2': 1, '3': 2, '4': 3 }
   */
  keyboard: {
    mappings: {
      A: 0, // First answer (top-left, green)
      K: 1, // Second answer (top-right, blue)
      S: 2, // Third answer (bottom-left, purple)
      L: 3, // Fourth answer (bottom-right, orange)
    },
    // Alternative mappings can be uncommented:
    // Z: 0, C: 1, B: 2, M: 3
  },

  /**
   * Question Settings
   */
  questions: {
    answersPerQuestion: 4,
    difficultyLevels: ['easy', 'medium', 'hard'] as const,
  },

  /**
   * API Configuration
   */
  api: {
    baseUrl: import.meta.env.VITE_API_URL || './',
    endpoints: {
      sessions: '/api/v1.0/sessions',
      questions: '/api/v1.0/questions',
      users: '/api/v1.0/users',
    },
    timeout: 10000, // Request timeout in milliseconds
  },

  /**
   * Telemetry Settings
   */
  telemetry: {
    enabled: (import.meta.env.VITE_TELEMETRY_ENABLED ?? 'true') !== 'false',
    endpoint: '/api/v1.0/telemetry/track',
    logToConsole: import.meta.env.VITE_TELEMETRY_DEBUG === 'true',
    mouseMovementSampleRate: 10, // Max mouse position samples per second
    batchSize: 50, // Number of events to batch before sending
    flushInterval: 5000, // Flush telemetry every N milliseconds
  },
} as const

export type GameConfig = typeof gameConfig
export type DifficultyLevel = typeof gameConfig.questions.difficultyLevels[number]
