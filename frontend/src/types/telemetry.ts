export type AnalyticsEventName =
  | 'pageview.home'
  | 'pageview.select-pool'
  | 'pool.selected'
  | 'user.register'
  | 'game.start'
  | 'game.answerquestion'
  | 'game.streakcompleted'
  | 'game.ended'
  | 'page.click'
  | 'page.touch'
  | 'page.keyboardkeydown'

export type AnalyticsEventType = 'pageview' | 'user' | 'game' | 'interaction' | 'custom'

export interface AnalyticsEventProperties {
  [key: string]: unknown
}

export interface AnalyticsEventContext {
  [key: string]: unknown
}

export interface AnalyticsQueueItem {
  event: AnalyticsEventName
  type: AnalyticsEventType
  timestamp: string
  userId?: string
  sessionId?: string
  properties?: AnalyticsEventProperties
  context?: AnalyticsEventContext
}
