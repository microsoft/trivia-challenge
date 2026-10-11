import { PLAYER_NAME_PREFIXES, PLAYER_NAME_TITLES } from './playerNameWords.generated.js'

export const PLAYER_NAME_MAX_LENGTH = 96
export const PLAYER_CODE_LENGTH = 5
export const PLAYER_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const PLAYER_CODE_PATTERN = new RegExp(`^[${PLAYER_CODE_ALPHABET}]{${PLAYER_CODE_LENGTH}}$`)
const baseNames = new Set(
  PLAYER_NAME_PREFIXES.flatMap(prefix => PLAYER_NAME_TITLES.map(title => `${prefix} ${title}`))
)

export function normalizePlayerCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
}

export function isPlayerCode(value: unknown): value is string {
  return typeof value === 'string' && PLAYER_CODE_PATTERN.test(normalizePlayerCode(value))
}

export function isGeneratedPlayerName(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > PLAYER_NAME_MAX_LENGTH) return false
  if (baseNames.has(value)) return true
  const match = /^(.*) ([1-9]\d*)$/.exec(value)
  if (!match) return false
  const counter = Number(match[2])
  return counter >= 2 && counter <= 2_147_483_647 && baseNames.has(match[1])
}

export { PLAYER_NAME_PREFIXES, PLAYER_NAME_TITLES } from './playerNameWords.generated.js'
