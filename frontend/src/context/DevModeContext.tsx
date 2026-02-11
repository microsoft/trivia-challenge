import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { AnalyticsQueueItem } from '../types/telemetry'
import { analytics } from '../services/analyticsService'

export interface DevModeState {
  /** Whether developer mode is active */
  isDevMode: boolean
  /** Toggle dev mode on/off */
  toggleDevMode: () => void
  /** Log of analytics events captured while dev mode is active */
  eventLog: AnalyticsQueueItem[]
  /** Push a new event into the log */
  pushEvent: (event: AnalyticsQueueItem) => void
  /** Clear the event log */
  clearEventLog: () => void
  /** Whether the analytics output stream is paused */
  isPaused: boolean
  /** Toggle pause/resume of event log streaming */
  togglePause: () => void
}

const DevModeContext = createContext<DevModeState | undefined>(undefined)

const MAX_EVENT_LOG_SIZE = 200

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false)
  const [eventLog, setEventLog] = useState<AnalyticsQueueItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(isPaused)

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const toggleDevMode = useCallback(() => {
    setIsDevMode(prev => !prev)
  }, [])

  const pushEvent = useCallback((event: AnalyticsQueueItem) => {
    if (isPausedRef.current) return
    setEventLog(prev => {
      const next = [...prev, event]
      if (next.length > MAX_EVENT_LOG_SIZE) {
        return next.slice(next.length - MAX_EVENT_LOG_SIZE)
      }
      return next
    })
  }, [])

  const clearEventLog = useCallback(() => {
    setEventLog([])
  }, [])

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  // Sync debug flag on analytics service when dev mode changes
  useEffect(() => {
    analytics.setDebugMode(isDevMode)
  }, [isDevMode])

  // Subscribe to analytics events when dev mode is active
  useEffect(() => {
    if (!isDevMode) return
    const unsubscribe = analytics.subscribe(pushEvent)
    return unsubscribe
  }, [isDevMode, pushEvent])

  // Listen for Ctrl+Shift+D to toggle dev mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault()
        toggleDevMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleDevMode])

  // Also enable via ?debug=true URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === 'true') {
      setIsDevMode(true)
    }
  }, [])

  const value: DevModeState = {
    isDevMode,
    toggleDevMode,
    eventLog,
    pushEvent,
    clearEventLog,
    isPaused,
    togglePause,
  }

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDevMode() {
  const context = useContext(DevModeContext)
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider')
  }
  return context
}
