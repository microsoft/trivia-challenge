/**
 * useGameTimer Hook
 * 
 * Custom hook for managing the game timer with countdown, pause, and streak bonuses.
 * Handles all timer-related logic including lifecycle management and cleanup.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { gameConfig } from '../config/gameConfig'

export type TimerState = 'idle' | 'countdown' | 'running' | 'paused' | 'ended'

interface UseGameTimerOptions {
  onCountdownComplete?: () => void
  onTimeUp?: () => void
  onBonusAwarded?: (bonusSeconds: number) => void
}

interface UseGameTimerReturn {
  timeLeft: number
  maxTime: number
  timerState: TimerState
  countdownValue: number
  isLowTime: boolean
  startCountdown: () => void
  pauseTimer: (duration?: number) => void
  resumeTimer: () => void
  addBonusTime: (streaksCompleted: number) => void
  deductTime: (seconds: number) => boolean
  resetTimer: () => void
  formatTime: (seconds: number) => string
}

export function useGameTimer({
  onCountdownComplete,
  onTimeUp,
  onBonusAwarded,
}: UseGameTimerOptions = {}): UseGameTimerReturn {
  const [timeLeft, setTimeLeft] = useState<number>(gameConfig.timer.initialSeconds)
  const [maxTime, setMaxTime] = useState<number>(gameConfig.timer.initialSeconds)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [countdownValue, setCountdownValue] = useState<number>(gameConfig.timer.countdownSeconds)
  
  const intervalRef = useRef<number | null>(null)
  const pauseTimeoutRef = useRef<number | null>(null)

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    }
  }, [])

  // Check if time is critically low
  const isLowTime = timeLeft <= gameConfig.timer.lowTimeThreshold && timerState === 'running'

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start countdown before game begins
  const startCountdown = useCallback(() => {
    setTimerState('countdown')
    setCountdownValue(gameConfig.timer.countdownSeconds)

    let count = gameConfig.timer.countdownSeconds
    const countdownInterval = setInterval(() => {
      count -= 1
      setCountdownValue(count)

      if (count <= 0) {
        clearInterval(countdownInterval)
        setTimerState('running')
        onCountdownComplete?.()
      }
    }, 1000)

    intervalRef.current = countdownInterval as unknown as number
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Main game timer effect
  useEffect(() => {
    if (timerState !== 'running') return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1

        if (newTime <= 0) {
          clearInterval(interval)
          setTimerState('ended')
          onTimeUp?.()
          return 0
        }

        return newTime
      })
    }, 1000)

    intervalRef.current = interval as unknown as number

    return () => clearInterval(interval)
  }, [timerState, onTimeUp])

  // Pause timer for a duration (e.g., wrong answer modal)
  const pauseTimer = useCallback((duration: number = gameConfig.timer.wrongAnswerPauseSeconds) => {
    if (timerState !== 'running') return

    setTimerState('paused')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Auto-resume after duration
    const timeout = setTimeout(() => {
      setTimerState('running')
    }, duration * 1000)

    pauseTimeoutRef.current = timeout as unknown as number
  }, [timerState])

  // Resume timer manually
  const resumeTimer = useCallback(() => {
    if (timerState === 'paused') {
      setTimerState('running')
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
        pauseTimeoutRef.current = null
      }
    }
  }, [timerState])

  // Add bonus time for streak completion
  const addBonusTime = useCallback((streaksCompleted: number) => {
    if (streaksCompleted <= gameConfig.timer.maxStreaks) {
      const bonusSeconds = gameConfig.timer.bonusSeconds
      const maxTotalSeconds = gameConfig.timer.maxTotalSeconds ?? Number.POSITIVE_INFINITY

      let effectiveBonus = bonusSeconds

      setTimeLeft(prev => {
        const next = Math.min(prev + bonusSeconds, maxTotalSeconds)
        effectiveBonus = next - prev
        return next
      })

      setMaxTime(prev => Math.min(prev + effectiveBonus, maxTotalSeconds))

      if (effectiveBonus > 0) {
        onBonusAwarded?.(effectiveBonus)
      }
    }
  }, [onBonusAwarded])

  // Deduct time for penalties (e.g., wrong answers). Returns true if timer ended.
  const deductTime = useCallback((seconds: number): boolean => {
    if (seconds <= 0) {
      return false
    }

    let shouldEnd = false

    setTimeLeft(prev => {
      if (prev <= 0) {
        return 0
      }

      const next = Math.max(0, prev - seconds)
      if (next === 0) {
        shouldEnd = true
      }
      return next
    })

    if (shouldEnd) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
        pauseTimeoutRef.current = null
      }
      setTimerState('ended')
      onTimeUp?.()
    }

    return shouldEnd
  }, [onTimeUp])

  // Reset timer to initial state
  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    
    setTimeLeft(gameConfig.timer.initialSeconds)
    setMaxTime(gameConfig.timer.initialSeconds)
    setTimerState('idle')
    setCountdownValue(gameConfig.timer.countdownSeconds)
    intervalRef.current = null
    pauseTimeoutRef.current = null
  }, [])

  return {
    timeLeft,
    maxTime,
    timerState,
    countdownValue,
    isLowTime,
    startCountdown,
    pauseTimer,
    resumeTimer,
    addBonusTime,
    deductTime,
    resetTimer,
    formatTime,
  }
}
