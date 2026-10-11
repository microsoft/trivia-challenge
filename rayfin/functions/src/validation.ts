import type { CreatePoolInput, EndSessionRequest, RegisterUserRequest, SubmitAnswerRequest } from './contracts.js'
import { DomainError } from './errors.js'
import { isCountry, normalizeCountry } from './countries.js'
import { GAME_RULE_DEFAULTS } from './gameRules.js'
import { isPlayerCode, normalizePlayerCode } from './playerIdentity.js'

export const TEXT_LIMIT = 4000
export const SLUG_LIMIT = 400
export const CSV_BYTE_LIMIT = 10 * 1024 * 1024
export const SQL_INT_MAX = 2_147_483_647

export function invalid(message: string): never {
  throw new DomainError('VALIDATION_ERROR', message)
}

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid('Expected a JSON object.')
  }
  return value as Record<string, unknown>
}

export function text(value: unknown, field: string, max = TEXT_LIMIT): string {
  if (typeof value !== 'string' || !value.trim()) return invalid(`${field} is required.`)
  const result = value.trim()
  if (result.length > max) return invalid(`${field} must be at most ${max} UTF-16 code units.`)
  return result
}

export function optionalText(value: unknown, field: string, max = TEXT_LIMIT): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return invalid(`${field} must be a string.`)
  return value.trim() ? text(value, field, max) : undefined
}

export function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return invalid(`${field} must be a UUID.`)
  }
  return value.toLowerCase()
}

export function slug(value: unknown, fallback?: string): string {
  if (fallback && (value === undefined || value === null || value === '' ||
      typeof value === 'string' && !value.trim())) return fallback
  const result = text(value, 'Pool slug', SLUG_LIMIT).toLowerCase()
  if (result.length > SLUG_LIMIT) return invalid(`Pool slug must be at most ${SLUG_LIMIT} UTF-16 code units.`)
  return result
}

export function number(value: unknown, field: string, min = 0, max = Number.MAX_VALUE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return invalid(`${field} must be a finite number between ${min} and ${max}.`)
  }
  return value
}

export function integer(value: unknown, field: string, min = 0, max = SQL_INT_MAX): number {
  const result = number(value, field, min, max)
  if (!Number.isInteger(result)) return invalid(`${field} must be an integer.`)
  return result
}

export function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') return invalid(`${field} must be a boolean.`)
  return value
}

export function registrationInput(value: unknown): RegisterUserRequest {
  const input = record(value)
  if (input.mode !== 'new' && input.mode !== 'returning') return invalid('Choose new or returning adventurer.')
  const allowed = input.mode === 'new'
    ? ['mode', 'requestId', 'country']
    : ['mode', 'secretCode']
  if (Object.keys(input).some(key => !allowed.includes(key))) {
    return invalid('Player entry accepts only mode, requestId, and country for a new adventurer, or mode and secretCode for a returning adventurer. Names, passwords, player codes, and runes are not accepted.')
  }
  if (input.mode === 'new') {
    if (!isCountry(input.country)) return invalid('Choose a country or region from the list.')
    return { mode: 'new', requestId: uuid(input.requestId, 'requestId'), country: normalizeCountry(input.country) }
  }
  if (typeof input.secretCode !== 'string') return invalid('Enter your 5-character secret code.')
  const secretCode = normalizePlayerCode(input.secretCode)
  if (!isPlayerCode(secretCode)) return invalid('Enter your 5-character secret code.')
  return { mode: 'returning', secretCode }
}

export function poolInput(value: unknown): Required<Omit<CreatePoolInput, 'description'>> & { description?: string } {
  const input = record(value)
  const normalizedSlug = slug(input.slug)
  return {
    slug: normalizedSlug,
    name: text(input.name, 'Pool name'),
    iconPath: input.iconPath === undefined || input.iconPath === null
      ? `/pools/${normalizedSlug}.svg`
      : optionalText(input.iconPath, 'Icon path') ?? '',
    description: optionalText(input.description, 'Description'),
    isActive: input.isActive === undefined || input.isActive === null ? true : boolean(input.isActive, 'isActive'),
    displayOrder: input.displayOrder === undefined || input.displayOrder === null
      ? 0 : integer(input.displayOrder, 'displayOrder', -2_147_483_648),
  }
}

export function answerInput(value: unknown): SubmitAnswerRequest & { sessionId: string } {
  const input = record(value)
  return {
    sessionId: uuid(input.sessionId, 'sessionId'),
    questionId: uuid(input.questionId, 'questionId'),
    answerIndex: integer(input.answerIndex, 'answerIndex', 0, GAME_RULE_DEFAULTS.questions.answersPerQuestion - 1),
    timeElapsed: number(input.timeElapsed, 'timeElapsed'),
    isCorrect: boolean(input.isCorrect, 'isCorrect'),
  }
}

export function endInput(value: unknown): EndSessionRequest & { sessionId: string } {
  const input = record(value)
  const heartsRemaining = number(
    input.heartsRemaining,
    'heartsRemaining',
    GAME_RULE_DEFAULTS.hearts.minimum,
    GAME_RULE_DEFAULTS.hearts.initialCount,
  )
  if (!Number.isInteger(heartsRemaining * 2)) return invalid('heartsRemaining must use half-heart increments.')
  return {
    sessionId: uuid(input.sessionId, 'sessionId'),
    questionsAnswered: integer(input.questionsAnswered, 'questionsAnswered'),
    correctAnswers: integer(input.correctAnswers, 'correctAnswers'),
    streaksCompleted: integer(input.streaksCompleted, 'streaksCompleted', 0, GAME_RULE_DEFAULTS.timer.maxStreaks),
    finalTimeRemaining: number(
      input.finalTimeRemaining,
      'finalTimeRemaining',
      0,
      GAME_RULE_DEFAULTS.timer.maxTotalSeconds,
    ),
    heartsRemaining,
    gameOverReason: optionalText(input.gameOverReason, 'gameOverReason'),
  }
}
