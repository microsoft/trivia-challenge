import type { OperationMap } from '../types/api'
import { isGeneratedPlayerName, isPlayerCode, normalizePlayerCode } from '../../rayfin/functions/src/playerIdentity'
import { isCountry } from '../../rayfin/functions/src/countries'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isCount = (value: unknown): value is number => isNumber(value) && Number.isInteger(value) && value >= 0
const optionalString = (value: unknown) => value === undefined || isString(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)

export function validValidationErrors(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) &&
    value.every(error => isRecord(error) && isCount(error.row) && isString(error.message)))
}

function pool(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name) &&
    isString(value.iconPath) && optionalString(value.description) &&
    typeof value.isActive === 'boolean' && isNumber(value.displayOrder)
}

function question(value: unknown): boolean {
  return isRecord(value) && isString(value.questionId) && isString(value.questionText) &&
    isString(value.category) && strings(value.choices) && value.choices.length === 4 &&
    isNumber(value.correctAnswerIndex) && Number.isInteger(value.correctAnswerIndex) &&
    value.correctAnswerIndex >= 0 && value.correctAnswerIndex < 4 &&
    (value.metadata === undefined || (isRecord(value.metadata) && Object.values(value.metadata).every(isString)))
}

export const operationResponseValidators: Record<keyof OperationMap, (value: unknown) => boolean> = {
  registerPlayer: value => isRecord(value) && isString(value.userId) && isGeneratedPlayerName(value.name) &&
    isCountry(value.country) && isString(value.createdAt) &&
    (value.secretCode === undefined || isString(value.secretCode) &&
      normalizePlayerCode(value.secretCode) === value.secretCode && isPlayerCode(value.secretCode)) &&
    Object.keys(value).every(key => ['userId', 'name', 'country', 'createdAt', 'secretCode'].includes(key)),
  listPools: value => Array.isArray(value) && value.every(pool),
  getPool: pool,
  createPool: pool,
  previewQuestionImport: value => isRecord(value) && isString(value.importId) &&
    isCount(value.questionCount) && value.questionCount > 0 && isCount(value.previousImportCount) &&
    Array.isArray(value.pools) && value.pools.length > 0 &&
    new Set(value.pools.map(destination => isRecord(destination) ? destination.slug : undefined)).size === value.pools.length &&
    value.pools.every(destination => isRecord(destination) && isString(destination.slug) &&
      isCount(destination.questionCount) && destination.questionCount > 0 &&
      isNumber(value.questionCount) && destination.questionCount <= value.questionCount &&
      (destination.existingPool === undefined || pool(destination.existingPool) &&
        isRecord(destination.existingPool) && destination.existingPool.id === destination.slug)),
  importQuestions: value => isRecord(value) && isString(value.importId) &&
    isCount(value.acceptedCount) && strings(value.questionIds) && value.questionIds.length === value.acceptedCount,
  startSession: value => isRecord(value) && isString(value.sessionId) && isString(value.userId) &&
    isString(value.poolId) && isString(value.startTime) && isNumber(value.seed) &&
    isString(value.status) && ['active', 'completed', 'abandoned'].includes(value.status),
  getSessionQuestions: value => isRecord(value) && Array.isArray(value.questions) && value.questions.every(question),
  submitAnswer: value => isRecord(value) && isCount(value.pointsEarned) && isCount(value.totalScore),
  endSession: value => isRecord(value) && isString(value.sessionId) && isCount(value.finalScore) &&
    isCount(value.questionsAnswered) && isCount(value.correctAnswers) && isNumber(value.accuracy) &&
    isCount(value.streaksCompleted) && isNumber(value.heartsRemaining) && optionalString(value.gameOverReason),
  trackTelemetryBatch: value => isRecord(value) && strings(value.acknowledgedEventIds) &&
    isString(value.processedAtUtc) && typeof value.forwarded === 'boolean' && optionalString(value.message),
}
