import { invokeOperation } from './rayfinClient'
import type { RegisteredPlayer, RegisterUserRequest } from '../types/api'
import { ensureStationAccess } from '../lib/stationLockdown'

export const userService = {
  async register(payload: RegisterUserRequest): Promise<RegisteredPlayer> {
    ensureStationAccess()
    return invokeOperation('registerPlayer', payload)
  },
}
