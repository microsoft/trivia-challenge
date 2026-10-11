import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { RayfinContext } from '@microsoft/fabric-user-data-functions'
import type { SqlParameters, SqlRow, SqlTable, SqlValue } from '../src/sql.js'

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const realCrypto = await import('node:crypto')
let forceNameWords = false
let queuedCodeIndexes: number[] = []
function queueCodes(...codes: string[]) {
  queuedCodeIndexes = codes.flatMap(code => [...code].map(char => {
    const index = CODE_ALPHABET.indexOf(char)
    if (index < 0) throw new Error(`Bad test code character ${char}`)
    return index
  }))
}
jest.unstable_mockModule('node:crypto', () => ({
  ...realCrypto,
  randomInt: (max: number) => {
    if (max === CODE_ALPHABET.length && queuedCodeIndexes.length > 0) {
      const next = queuedCodeIndexes.shift()
      if (next === undefined) throw new Error('Missing queued code index')
      return next
    }
    return forceNameWords && max !== CODE_ALPHABET.length ? 0 : realCrypto.randomInt(max)
  },
}))
const realSql = await import('../src/sql.js')
let tables: Record<string, SqlRow[]> = {}
let failPlayerInsert = false
let transactionTail: Promise<unknown> = Promise.resolve()
const query = jest.fn(
  async (statement: string, parameters: SqlParameters = {}): Promise<SqlRow[]> => {
    if (statement.startsWith('UPDATE [dbo].[PlayerEntryStates]')) {
      const row = tables.PlayerEntryStates.find(entry => entry.id === parameters.id.value)
      if (!row) throw new Error('Entry state is missing')
      row.windowStartedAt = parameters.started.value
      row.attemptCount = parameters.count.value
      return []
    }
    if (statement.includes('FROM [dbo].[PlayerEntryStates]')) {
      return tables.PlayerEntryStates.filter(row => row.id === parameters.id.value)
    }
    if (statement.includes('AS [highestSuffix]')) {
      const base = String(parameters.name.value)
      const names = tables.Players.map(row => row.name).filter(
        (name): name is string => typeof name === 'string'
      )
      const suffixes = names
        .filter(name => name.startsWith(`${base} `))
        .map(name => Number(name.slice(base.length + 1)))
        .filter(Number.isInteger)
      return [
        {
          hasBase: names.includes(base) ? 1 : 0,
          highestSuffix: Math.max(names.includes(base) ? 1 : 0, ...suffixes),
        },
      ]
    }
    if (statement.includes('SELECT TOP 1 1 AS [exists]')) {
      return tables.Players.some(row => row.secretCodeHash === parameters.hash.value)
        ? [{ exists: 1 }]
        : []
    }
    if (statement.includes('SELECT TOP 2') && statement.includes('[secretCodeHash] = @hash')) {
      return tables.Players.filter(row => row.secretCodeHash === parameters.hash.value).slice(0, 2)
    }
    if (statement.includes('FROM [dbo].[Players]')) {
      return tables.Players.filter(row =>
        parameters.id
          ? row.id === parameters.id.value
          : parameters.name
            ? row.name === parameters.name.value
            : true
      )
    }
    throw new Error(`Unexpected query: ${statement}`)
  }
)
const insert = jest.fn(
  async (table: SqlTable, columns: readonly string[], rows: readonly SqlValue[][]) => {
    if (table === 'Players' && failPlayerInsert) throw new Error('Simulated player insert failure')
    for (const row of rows) {
      const entry = Object.fromEntries(columns.map((column, index) => [column, row[index].value]))
      if (
        tables[table].some(
          existing =>
            existing.id === entry.id ||
            (table === 'Players' && existing.name === entry.name)
        )
      ) {
        throw new Error('Unique constraint violation')
      }
      tables[table].push(entry)
    }
  }
)
const dataSession = { query, insert }
const transaction = jest.fn(<T>(action: (sql: typeof dataSession) => Promise<T>): Promise<T> => {
  const next = transactionTail.then(async () => {
    const previous = structuredClone(tables)
    try {
      return await action(dataSession)
    } catch (error) {
      tables = previous
      throw error
    }
  })
  transactionTail = next.catch(() => undefined)
  return next
})
jest.unstable_mockModule('../src/sql.js', () => ({
  ...realSql,
  withSql: async <T>(
    _ctx: RayfinContext,
    action: (sql: typeof dataSession & { transaction: typeof transaction }) => Promise<T>
  ) => action({ ...dataSession, transaction }),
}))
const { registerPlayer, PLAYER_ENTRY_LIMITS } = await import('../src/players.js')
const { hashPlayerCode } = await import('../src/playerCredentials.js')
const {
  isGeneratedPlayerName,
  PLAYER_NAME_PREFIXES,
  PLAYER_NAME_TITLES,
} = await import('../src/playerIdentity.js')
const ctx = new RayfinContext({
  rayFinEndpoint: 'https://example.invalid',
  publishableKey: 'pk-test',
  rayfinToken: '',
})
const request = () => ({
  mode: 'new' as const,
  requestId: realCrypto.randomUUID(),
  country: 'Canada',
})
const returning = (secretCode: string) => ({ mode: 'returning' as const, secretCode })
function withoutCode<T extends { secretCode?: string }>(player: T): Omit<T, 'secretCode'> {
  const publicPlayer = { ...player }
  delete publicPlayer.secretCode
  return publicPlayer
}

beforeEach(() => {
  tables = { Players: [], PlayerEntryStates: [] }
  forceNameWords = false
  queuedCodeIndexes = []
  failPlayerInsert = false
  transactionTail = Promise.resolve()
  query.mockClear()
  insert.mockClear()
  transaction.mockClear()
})

describe('contact-free player persistence', () => {
  it('uses a plain name first, then 2 and 3, with one name query per concurrent creation', async () => {
    forceNameWords = true
    queueCodes('00000', '00001', '00002')
    const base = `${PLAYER_NAME_PREFIXES[0]} ${PLAYER_NAME_TITLES[0]}`
    const inputs = [request(), request(), request()]
    const players = await Promise.all(inputs.map(input => registerPlayer(ctx, input)))
    expect(players.map(player => player.name)).toEqual([base, `${base} 2`, `${base} 3`])
    expect(players.map(player => player.secretCode)).toEqual(['00000', '00001', '00002'])
    expect(query.mock.calls.filter(([sql]) => sql.includes('AS [highestSuffix]'))).toHaveLength(3)
  })

  it('increments the highest numeric collision suffix rather than probing all existing names', async () => {
    forceNameWords = true
    queueCodes('00000', '00001')
    const first = await registerPlayer(ctx, request())
    tables.Players.push(
      { name: `${first.name} 9` },
      { name: `${first.name} 10` },
      { name: `${first.name} Extra` }
    )
    expect((await registerPlayer(ctx, request())).name).toBe(`${first.name} 11`)
    const allocations = query.mock.calls.filter(([sql]) => sql.includes('AS [highestSuffix]'))
    expect(allocations).toHaveLength(2)
    expect(allocations[1][0]).toContain("LIKE @prefix ESCAPE N'~'")
  })

  it('stores the selected country and returns the one-time secret code without disclosing the hash', async () => {
    queueCodes('ABCDE')
    const input = request()
    const player = await registerPlayer(ctx, input)
    expect(Object.keys(player).sort()).toEqual(['country', 'createdAt', 'name', 'secretCode', 'userId'])
    expect(player.country).toBe('Canada')
    expect(player.userId).toBe(input.requestId)
    expect(player.secretCode).toBe('ABCDE')
    expect(isGeneratedPlayerName(player.name)).toBe(true)
    expect(tables.Players).toHaveLength(1)
    expect(tables.Players[0]).toMatchObject({ id: input.requestId, country: 'Canada' })
    expect(tables.Players[0].secretCodeHash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(tables.Players[0])).not.toContain('ABCDE')
    for (const key of ['email', 'phoneNumber', 'state', 'city', 'password', 'playerCode', 'secretCode']) {
      expect(tables.Players[0]).not.toHaveProperty(key)
    }
    expect(JSON.stringify(player)).not.toMatch(/hash|salt/i)
    const returned = await registerPlayer(ctx, returning('a-bcde'))
    expect(returned).toEqual(withoutCode(player))
    expect(Object.keys(returned)).not.toContain('secretCode')
  })

  it('rejects a replayed creation ID without rotating or reissuing the secret code', async () => {
    queueCodes('ABCDE')
    const input = request()
    await registerPlayer(ctx, input)
    const storedHash = tables.Players[0].secretCodeHash
    await expect(registerPlayer(ctx, input)).rejects.toMatchObject({
      code: 'PLAYER_ALREADY_CREATED',
      retryable: false,
    })
    expect(tables.Players).toHaveLength(1)
    expect(tables.Players[0].secretCodeHash).toBe(storedHash)
  })

  it.each([
    ['Åland Islands', 'Aland Islands'],
    ['Côte d’Ivoire', "Cote d'Ivoire"],
    ['Curaçao', 'Curacao'],
    ['Réunion', 'Reunion'],
    ['Saint Barthélemy', 'Saint Barthelemy'],
    ['São Tomé and Príncipe', 'Sao Tome and Principe'],
    ['Türkiye', 'Turkiye'],
  ])('stores %s as %s and preserves legacy country reads', async (previous, current) => {
    queueCodes('ABCDE')
    const input = { ...request(), country: previous }
    const player = await registerPlayer(ctx, input)
    expect(player.country).toBe(current)
    expect(tables.Players[0].country).toBe(current)
    const playerInsert = insert.mock.calls.find(([table]) => table === 'Players')
    expect(playerInsert).toBeDefined()
    if (!playerInsert) throw new Error('Missing player insert.')
    const [, columns, rows] = playerInsert
    expect(rows[0][columns.indexOf('country')]).toEqual(realSql.str(current, 80))

    tables.Players[0].country = previous
    expect(await registerPlayer(ctx, returning('ABCDE'))).toEqual(withoutCode(player))
    expect(tables.Players).toHaveLength(1)
    expect(tables.Players[0].country).toBe(previous)
  })

  it('serializes simultaneous creation attempts with the same request ID', async () => {
    queueCodes('ABCDE')
    const input = request()
    const [first, replay] = await Promise.allSettled([
      registerPlayer(ctx, input),
      registerPlayer(ctx, input),
    ])
    expect(first.status).toBe('fulfilled')
    expect(replay.status).toBe('rejected')
    if (replay.status !== 'rejected') throw new Error('Expected replay to reject')
    expect(replay.reason).toMatchObject({ code: 'PLAYER_ALREADY_CREATED' })
    expect(tables.Players).toHaveLength(1)
    expect(
      query.mock.calls.some(
        ([statement]) =>
          statement.includes('PlayerEntryStates') && statement.includes('UPDLOCK, HOLDLOCK')
      )
    ).toBe(true)
  })

  it('verifies a returning player by normalized secret code only', async () => {
    queueCodes('ABCDE')
    const player = await registerPlayer(ctx, request())
    await expect(registerPlayer(ctx, returning('ZZZZZ'))).rejects.toMatchObject({
      code: 'PLAYER_VERIFICATION_FAILED',
    })
    expect(await registerPlayer(ctx, returning(' ab-cde '))).toEqual(withoutCode(player))
  })

  it('does not reveal whether an unknown or duplicate secret code caused a failure', async () => {
    queueCodes('ABCDE')
    const player = await registerPlayer(ctx, request())
    const missing = await registerPlayer(ctx, returning('ZZZZZ')).catch(error => error)
    tables.Players.push({ ...tables.Players[0], id: realCrypto.randomUUID(), name: `${player.name} 2` })
    const duplicate = await registerPlayer(ctx, returning('ABCDE')).catch(error => error)
    expect(missing.code).toBe('PLAYER_VERIFICATION_FAILED')
    expect(duplicate.code).toBe(missing.code)
    expect(duplicate.message).toBe(missing.message)
  })

  it('does not accept any code for a player saved before secret codes existed', async () => {
    queueCodes('ABCDE')
    await registerPlayer(ctx, request())
    tables.Players[0].secretCodeHash = null
    await expect(registerPlayer(ctx, returning('ABCDE'))).rejects.toMatchObject({
      code: 'PLAYER_VERIFICATION_FAILED',
    })
  })

  it('retries secret-code allocation collisions before inserting the player', async () => {
    const collisionHash = await hashPlayerCode('00000')
    tables.Players.push({
      id: realCrypto.randomUUID(),
      name: 'Amber Query Crafter',
      country: 'Canada',
      secretCodeHash: collisionHash,
      createdAt: new Date(),
    })
    queueCodes('00000', '00001')
    const player = await registerPlayer(ctx, request())
    expect(player.secretCode).toBe('00001')
    expect(tables.Players.at(-1)?.secretCodeHash).toBe(await hashPlayerCode('00001'))
    expect(query.mock.calls.filter(([sql]) => sql.includes('SELECT TOP 1 1 AS [exists]'))).toHaveLength(2)
  })

  it('returns a retryable error when secret-code allocation keeps colliding', async () => {
    tables.Players.push({
      id: realCrypto.randomUUID(),
      name: 'Amber Query Crafter',
      country: 'Canada',
      secretCodeHash: await hashPlayerCode('00000'),
      createdAt: new Date(),
    })
    queueCodes('00000', '00000', '00000', '00000', '00000')
    await expect(registerPlayer(ctx, request())).rejects.toMatchObject({
      code: 'PLAYER_CODE_UNAVAILABLE',
      retryable: true,
    })
    expect(tables.Players).toHaveLength(1)
  })

  it('enforces the shared minute limit across requests without using attendee/IP identifiers', async () => {
    tables.PlayerEntryStates.push({
      id: '00000000-0000-4000-8000-000000000001',
      windowStartedAt: new Date(),
      attemptCount: PLAYER_ENTRY_LIMITS.attemptsPerMinute,
    })
    await expect(registerPlayer(ctx, request())).rejects.toMatchObject({
      code: 'PLAYER_ENTRY_LIMITED',
    })
    expect(query).toHaveBeenCalledTimes(1)
    expect(tables.Players).toHaveLength(0)
    tables.PlayerEntryStates[0].windowStartedAt = new Date(Date.now() - 60_100)
    queueCodes('ABCDE')
    await registerPlayer(ctx, request())
    expect(tables.PlayerEntryStates[0].attemptCount).toBe(1)
  })

  it('rolls back a partially created identity on SQL failure, allowing a stable retry', async () => {
    failPlayerInsert = true
    queueCodes('ABCDE')
    const input = request()
    await expect(registerPlayer(ctx, input)).rejects.toThrow('Simulated player insert failure')
    expect(tables.Players).toHaveLength(0)
    expect(tables.PlayerEntryStates).toHaveLength(0)
    failPlayerInsert = false
    queueCodes('ABCDE')
    expect((await registerPlayer(ctx, input)).userId).toBe(input.requestId)
  })

  it('rejects contact data before opening a SQL transaction', async () => {
    await expect(
      registerPlayer(ctx, { ...request(), email: 'person@example.invalid' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(transaction).not.toHaveBeenCalled()
  })
})
