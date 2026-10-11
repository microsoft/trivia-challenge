import type { RayfinContext } from '@microsoft/fabric-user-data-functions'
import type { RegisteredPlayer, User } from './contracts.js'
import { DomainError } from './errors.js'
import { generatePlayerCode, generatePlayerName, hashPlayerCode } from './playerCredentials.js'
import { PLAYER_NAME_MAX_LENGTH } from './playerIdentity.js'
import { isCountry, normalizeCountry } from './countries.js'
import {
  date,
  id,
  int,
  rowDate,
  rowNumber,
  rowText,
  rowUuid,
  str,
  withSql,
  type SqlRow,
  type SqlSession,
} from './sql.js'
import { registrationInput } from './validation.js'

export const PLAYER_ENTRY_LIMITS = {
  attemptsPerMinute: 60,
} as const

const ENTRY_STATE_ID = '00000000-0000-4000-8000-000000000001'
const PLAYER_COLUMNS = '[id], [name], [country], [secretCodeHash], [createdAt]'
const CODE_COLLISION_RETRIES = 5

function playerDto(row: SqlRow): User {
  const country = normalizeCountry(rowText(row, 'country'))
  if (!isCountry(country)) throw new Error('Stored player country is not supported.')
  return {
    userId: rowUuid(row, 'id'),
    name: rowText(row, 'name'),
    country,
    createdAt: rowDate(row, 'createdAt'),
  }
}

function verificationFailure(): DomainError {
  return new DomainError(
    'PLAYER_VERIFICATION_FAILED',
    'That secret code didn\'t match an adventurer. Check your photo and try again, or start a new challenge.'
  )
}

async function reserveEntryAttempt(sql: SqlSession, now: Date): Promise<boolean> {
  // One deployment-wide lock bounds distributed guessing without storing IPs or browser identifiers.
  const [state] = await sql.query(
    'SELECT [id], [windowStartedAt], [attemptCount] FROM [dbo].[PlayerEntryStates] WITH (UPDLOCK, HOLDLOCK) WHERE [id] = @id;',
    { id: id(ENTRY_STATE_ID) }
  )
  if (!state) {
    await sql.insert(
      'PlayerEntryStates',
      ['id', 'windowStartedAt', 'attemptCount'],
      [[id(ENTRY_STATE_ID), date(now), int(1)]]
    )
    return true
  }
  const expired = now.getTime() - Date.parse(rowDate(state, 'windowStartedAt')) >= 60_000
  const count = expired ? 0 : rowNumber(state, 'attemptCount')
  if (count >= PLAYER_ENTRY_LIMITS.attemptsPerMinute) return false
  await sql.query(
    'UPDATE [dbo].[PlayerEntryStates] SET [windowStartedAt] = @started, [attemptCount] = @count WHERE [id] = @id;',
    {
      id: id(ENTRY_STATE_ID),
      started: date(expired ? now : new Date(rowDate(state, 'windowStartedAt'))),
      count: int(count + 1),
    }
  )
  return true
}

async function availableName(sql: SqlSession): Promise<string | DomainError> {
  const base = generatePlayerName()
  const prefix = base
    .replaceAll('~', '~~')
    .replaceAll('%', '~%')
    .replaceAll('_', '~_')
    .replaceAll('[', '~[')
  // The entry-state lock serializes allocation; the name index bounds this single aggregate.
  const [row] = await sql.query(
    `SELECT COALESCE(MAX(CASE WHEN [name] = @name THEN 1 ELSE 0 END), 0) AS [hasBase],
      COALESCE(MAX(CASE WHEN [name] = @name THEN 1
        ELSE TRY_CONVERT(INT, SUBSTRING([name], LEN(@name) + 2, 96)) END), 0) AS [highestSuffix]
      FROM [dbo].[Players] WHERE [name] = @name OR [name] LIKE @prefix ESCAPE N'~';`,
    { name: str(base, PLAYER_NAME_MAX_LENGTH), prefix: str(`${prefix} %`, 200) }
  )
  if (!row) throw new Error('Player name allocation did not return an aggregate.')
  if (rowNumber(row, 'hasBase') === 0) return base
  const highest = rowNumber(row, 'highestSuffix')
  if (highest >= 2_147_483_647) {
    return new DomainError(
      'PLAYER_NAME_UNAVAILABLE',
      'This adventurer name could not be reserved. Please retry.',
      true
    )
  }
  return `${base} ${Math.max(1, highest) + 1}`
}

async function allocateSecretCode(sql: SqlSession): Promise<{ secretCode: string; secretCodeHash: string } | DomainError> {
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt += 1) {
    const secretCode = generatePlayerCode()
    const secretCodeHash = await hashPlayerCode(secretCode)
    const [collision] = await sql.query(
      'SELECT TOP 1 1 AS [exists] FROM [dbo].[Players] WHERE [secretCodeHash] = @hash;',
      { hash: str(secretCodeHash, 64) }
    )
    if (!collision) return { secretCode, secretCodeHash }
  }
  return new DomainError(
    'PLAYER_CODE_UNAVAILABLE',
    'A secret code could not be reserved. Please retry.',
    true
  )
}

export async function registerPlayer(ctx: RayfinContext, value: unknown): Promise<RegisteredPlayer> {
  const input = registrationInput(value)
  const result = await withSql(ctx, sql =>
    sql.transaction(async transaction => {
      const now = new Date()
      if (!(await reserveEntryAttempt(transaction, now))) {
        return new DomainError(
          'PLAYER_ENTRY_LIMITED',
          'Too many player-entry attempts. Please wait one minute and try again.'
        )
      }
      if (input.mode === 'returning') {
        const secretCodeHash = await hashPlayerCode(input.secretCode)
        const matches = await transaction.query(
          `SELECT TOP 2 ${PLAYER_COLUMNS} FROM [dbo].[Players] WHERE [secretCodeHash] = @hash;`,
          { hash: str(secretCodeHash, 64) }
        )
        return matches.length === 1 ? playerDto(matches[0]) : verificationFailure()
      }

      const [existing] = await transaction.query(
        `SELECT ${PLAYER_COLUMNS} FROM [dbo].[Players] WITH (UPDLOCK, HOLDLOCK) WHERE [id] = @id;`,
        { id: id(input.requestId) }
      )
      if (existing) {
        return new DomainError(
          'PLAYER_ALREADY_CREATED',
          'This adventurer was already created, and its secret code can only be shown once. Start a new challenge.'
        )
      }
      const name = await availableName(transaction)
      if (name instanceof DomainError) return name
      const code = await allocateSecretCode(transaction)
      if (code instanceof DomainError) return code
      await transaction.insert(
        'Players',
        ['id', 'name', 'country', 'secretCodeHash', 'createdAt'],
        [[
          id(input.requestId),
          str(name, PLAYER_NAME_MAX_LENGTH),
          str(input.country, 80),
          str(code.secretCodeHash, 64),
          date(now),
        ]]
      )
      return {
        userId: input.requestId,
        name,
        country: input.country,
        createdAt: now.toISOString(),
        secretCode: code.secretCode,
      }
    })
  )
  // Domain errors must commit; throwing inside the transaction would undo the shared entry limit.
  if (result instanceof DomainError) throw result
  return result
}
