/**
 * Analytics Service
 *
 * Handles client-side telemetry tracking and forwarding to the backend API.
 * Designed for future extensibility (console logging, DevTools integration, etc.).
 */

import { apiClient } from './apiClient'
import { gameConfig } from '../config/gameConfig'
import type { ApiResponse, TelemetryTrackResponse, TelemetryEvent } from '../types/api'
import type {
  AnalyticsEventName,
  AnalyticsEventType,
  AnalyticsQueueItem,
  AnalyticsEventProperties,
  AnalyticsEventContext,
} from '../types/telemetry'
import type { User } from '../types/api'

const EVENT_TYPE_MAP: Record<AnalyticsEventName, AnalyticsEventType> = {
  'pageview.home': 'pageview',
  'user.register': 'user',
  'game.start': 'game',
  'game.answerquestion': 'game',
  'game.streakcompleted': 'game',
  'game.ended': 'game',
  'page.click': 'interaction',
  'page.touch': 'interaction',
  'page.keyboardkeydown': 'interaction',
}

const INTERACTIVE_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function describeElement(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) {
    return 'unknown'
  }

  const id = target.id ? `#${target.id}` : ''
  const cls = target.className && typeof target.className === 'string'
    ? `.${target.className.split(/\s+/).filter(Boolean).join('.')}`
    : ''

  return `${target.tagName.toLowerCase()}${id}${cls}`
}

class AnalyticsService {
  private readonly config = gameConfig.telemetry
  private readonly queue: AnalyticsQueueItem[] = []
  private initialized = false
  private isFlushing = false
  private flushTimer: number | null = null
  private userId?: string
  private currentSessionId?: string
  private lastPointerEventTimestamp = 0

  initialize(): void {
    if (this.initialized || !this.config.enabled || typeof window === 'undefined') {
      return
    }

    this.initialized = true

    if (this.config.flushInterval > 0) {
      this.flushTimer = window.setInterval(() => {
        void this.flush()
      }, this.config.flushInterval)
    }

    window.addEventListener('beforeunload', this.handleBeforeUnload)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    document.addEventListener('click', this.handleClick, { passive: true })
    document.addEventListener('touchstart', this.handleTouch, { passive: true })
    document.addEventListener('keydown', this.handleKeydown, { passive: true })
  }

  identify(user: User | null): void {
    this.userId = user?.userId ?? undefined
  }

  setSession(sessionId: string | null): void {
    this.currentSessionId = sessionId ?? undefined
  }

  track(eventName: AnalyticsEventName, properties: AnalyticsEventProperties = {}, context: AnalyticsEventContext = {}): void {
    if (!this.config.enabled || typeof window === 'undefined') {
      return
    }

    const sanitizedProperties = this.sanitize(properties)
    const enrichedContext = this.enrichContext(context)

    const queueItem: AnalyticsQueueItem = {
      event: eventName,
      type: EVENT_TYPE_MAP[eventName] ?? 'custom',
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.currentSessionId,
      properties: sanitizedProperties,
      context: enrichedContext,
    }

    this.queue.push(queueItem)

    if (this.config.logToConsole) {
      console.log('[Telemetry]', queueItem)
    }

    if (this.queue.length >= this.config.batchSize) {
      void this.flush()
    }
  }

  async flush(): Promise<void> {
    if (!this.config.enabled || this.isFlushing || this.queue.length === 0) {
      return
    }

    this.isFlushing = true
    const batch = this.queue.splice(0, this.queue.length)

    try {
      for (const item of batch) {
        await this.send(item)
      }
    } catch (error) {
      console.error('Telemetry flush failed; re-queueing events', error)
      this.queue.unshift(...batch)
    } finally {
      this.isFlushing = false
    }
  }

  private sanitize<T extends Record<string, unknown>>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data)) as T
    } catch {
      return {} as T
    }
  }

  private enrichContext(context: AnalyticsEventContext): AnalyticsEventContext {
    if (typeof window === 'undefined') {
      return context
    }

    const baseContext: AnalyticsEventContext = {
      url: window.location.href,
      path: window.location.pathname,
      language: window.navigator.language,
      userAgent: window.navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${window.screen.width}x${window.screen.height}`,
    }

    if (this.currentSessionId) {
      baseContext.sessionId = this.currentSessionId
    }

    return {
      ...baseContext,
      ...context,
    }
  }

  private async send(item: AnalyticsQueueItem): Promise<void> {
    const payload: TelemetryEvent = {
      event: item.event,
      type: item.type,
      timestamp: item.timestamp,
      userId: item.userId,
      properties: item.properties,
      context: item.context,
    }

    const response = await apiClient.post<ApiResponse<TelemetryTrackResponse>>(this.config.endpoint, payload)

    if (!response.success) {
      const message = response.errorMessage ?? 'Telemetry request rejected by API'
      throw new Error(message)
    }
  }

  private handleClick = (event: MouseEvent): void => {
    const now = performance.now()
    if (now - this.lastPointerEventTimestamp < 16) {
      return
    }
    this.lastPointerEventTimestamp = now

    this.track('page.click', {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      element: describeElement(event.target),
    })
  }

  private handleTouch = (event: TouchEvent): void => {
    const touch = event.touches[0] ?? event.changedTouches[0]
    if (!touch) {
      return
    }

    const now = performance.now()
    if (now - this.lastPointerEventTimestamp < 16) {
      return
    }
    this.lastPointerEventTimestamp = now

    this.track('page.touch', {
      x: touch.clientX,
      y: touch.clientY,
      element: describeElement(event.target),
    })
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return
    }

    const target = event.target as HTMLElement | null
    if (target && INTERACTIVE_INPUT_TAGS.has(target.tagName)) {
      return
    }

    const keyValue = this.shouldCaptureExactKey(event.key)
      ? event.key
      : this.generalizeKey(event.key)

    this.track('page.keyboardkeydown', {
      key: keyValue,
      code: event.code,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      element: describeElement(target),
    })
  }

  private shouldCaptureExactKey(key: string): boolean {
    const configuredKeys = Object.keys(gameConfig.keyboard.mappings)
    return configuredKeys.includes(key.toUpperCase()) || key.length > 1
  }

  private generalizeKey(key: string): string {
    if (key.length !== 1) {
      return key
    }
    if (/^[0-9]$/.test(key)) {
      return 'digit'
    }
    if (/^[a-zA-Z]$/.test(key)) {
      return 'alpha'
    }
    return 'character'
  }

  private handleBeforeUnload = (): void => {
    if (this.flushTimer !== null) {
      window.clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    void this.flush()
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void this.flush()
    }
  }
}

export const analytics = new AnalyticsService()
