import { randomInt, scrypt } from 'node:crypto'
import {
  normalizePlayerCode,
  PLAYER_CODE_ALPHABET,
  PLAYER_CODE_LENGTH,
  PLAYER_NAME_PREFIXES,
  PLAYER_NAME_TITLES,
} from './playerIdentity.js'

const SECRET_CODE_SALT = 'fabric-trivia-secret-code-v1'
const CODE_HASH_PATTERN = /^[a-f0-9]{64}$/

function deriveSecretCodeHash(secretCode: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      secretCode,
      SECRET_CODE_SALT,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error)
        else resolve(key)
      }
    )
  })
}

export function generatePlayerCode(): string {
  let code = ''
  for (let index = 0; index < PLAYER_CODE_LENGTH; index += 1) {
    code += PLAYER_CODE_ALPHABET[randomInt(PLAYER_CODE_ALPHABET.length)]
  }
  return code
}

export async function hashPlayerCode(secretCode: string): Promise<string> {
  const normalized = normalizePlayerCode(secretCode)
  if (!new RegExp(`^[${PLAYER_CODE_ALPHABET}]{${PLAYER_CODE_LENGTH}}$`).test(normalized)) {
    throw new Error('Player secret code is invalid.')
  }
  const hash = (await deriveSecretCodeHash(normalized)).toString('hex')
  if (!CODE_HASH_PATTERN.test(hash)) throw new Error('Player secret code hash is invalid.')
  return hash
}

export function generatePlayerName(): string {
  return (
    `${PLAYER_NAME_PREFIXES[randomInt(PLAYER_NAME_PREFIXES.length)]} ` +
    `${PLAYER_NAME_TITLES[randomInt(PLAYER_NAME_TITLES.length)]}`
  )
}
