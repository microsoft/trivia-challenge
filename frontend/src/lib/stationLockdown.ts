import { gameConfig } from '../config/gameConfig'
import { getCookie } from './utils'

const LOCKDOWN_ERROR_NAME = 'StationLockdownError'

export class StationLockdownError extends Error {
  constructor(message: string = gameConfig.lockdown.message) {
    super(message)
    this.name = LOCKDOWN_ERROR_NAME
    Object.setPrototypeOf(this, StationLockdownError.prototype)
  }
}

function resolveStationId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const cookieValue = getCookie('stationId')
  if (cookieValue && cookieValue.trim().length > 0) {
    return cookieValue
  }

  const queryValue = new URLSearchParams(window.location.search).get('stationId')
  return queryValue && queryValue.trim().length > 0 ? queryValue : null
}

export function hasStationId(): boolean {
  return resolveStationId() !== null
}

export function isStationLockdownActive(): boolean {
  if (!gameConfig.lockdown.requireStationId) {
    return false
  }
  return !hasStationId()
}

export function ensureStationAccess(): void {
  if (isStationLockdownActive()) {
    throw new StationLockdownError()
  }
}

export function getStationLockdownMessage(): string {
  return gameConfig.lockdown.message
}
