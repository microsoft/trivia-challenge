import { describe, expect, it } from '@jest/globals'
import { DomainError, functionResult } from '../src/errors.js'
import { answerInput, endInput, poolInput, registrationInput, slug, uuid } from '../src/validation.js'

const sessionId = '11111111-1111-4111-8111-111111111111'
const questionId = '22222222-2222-4222-8222-222222222222'
const answer = { sessionId, questionId, answerIndex: 0, timeElapsed: 0.123456789, isCorrect: false }

describe('operation validation', () => {
  it('normalizes secret codes without accepting contact details or legacy credentials', () => {
    expect(registrationInput({
      mode: 'returning', secretCode: ' o-il10 ',
    })).toEqual({
      mode: 'returning', secretCode: '01110',
    })
    expect(registrationInput({
      mode: 'new', requestId: sessionId.toUpperCase(), country: 'Canada',
    })).toEqual({ mode: 'new', requestId: sessionId, country: 'Canada' })
    expect(() => registrationInput({ email: 'test@example.invalid', name: 'Amber Query Crafter' })).toThrow(DomainError)
  })

  it.each([undefined, null, '', ' ', 'Unlisted country', 'Canada, Ontario', 'canada', 1, {}])(
    'rejects new-player countries outside the approved list: %j',
    country => {
      expect(() => registrationInput({
        mode: 'new', requestId: sessionId, country,
      })).toThrow('Choose a country or region from the list.')
    }
  )

  it.each([
    { secretCode: undefined },
    { secretCode: 'ABCD' },
    { secretCode: 'ABCDEF' },
    { secretCode: 'ABCU1' },
    { secretCode: 1234 },
    { mode: 'other' },
    { name: undefined },
    { name: 'Person' },
    { name: 'Amber Query Crafter 02' },
    { playerCode: 'K001' },
    { runes: ['lakehouse', 'notebook', 'warehouse'] },
    { email: 'test@example.invalid' },
    { phoneNumber: '12345' },
    { country: 'Country' },
  ])('rejects unsupported or private player input %o', overrides => {
    expect(() => registrationInput({
      mode: 'returning', secretCode: 'ABCDE', ...overrides,
    })).toThrow(DomainError)
  })

  it('rejects extra fields on new adventurers', () => {
    expect(() => registrationInput({
      mode: 'new', requestId: sessionId, country: 'Canada', password: 'abc',
    })).toThrow('Names, passwords, player codes, and runes are not accepted.')
  })

  it('preserves pool defaults and the slug-shaped contract', () => {
    expect(poolInput({ slug: ' IGNITE ', name: ' Ignite ' })).toEqual({
      slug: 'ignite', name: 'Ignite', iconPath: '/pools/ignite.svg',
      description: undefined, isActive: true, displayOrder: 0,
    })
    expect(poolInput({ slug: 'p', name: 'P', iconPath: '', isActive: false, displayOrder: -2 }))
      .toMatchObject({ iconPath: '', isActive: false, displayOrder: -2 })
    expect(slug(undefined, 'default')).toBe('default')
    expect(slug(' ', 'default')).toBe('default')
  })

  it('normalizes UUID case without accepting malformed UUIDs', () => {
    expect(uuid('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA', 'id')).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(() => uuid('oops', 'id')).toThrow(DomainError)
  })

  it('keeps elapsed time precision and ignores correctness only after validating its shape', () => {
    expect(answerInput(answer)).toEqual(answer)
    expect(() => answerInput({ ...answer, isCorrect: 'false' })).toThrow(DomainError)
  })

  it.each([null, [], '', 12])('rejects non-object payload %j', (value) => {
    expect(() => registrationInput(value)).toThrow(DomainError)
  })

  it.each([-1, 4, 0.5, Infinity, NaN, '1'])('rejects invalid answer index %j', (answerIndex) => {
    expect(() => answerInput({ ...answer, answerIndex })).toThrow(DomainError)
  })

  it.each([-1, Infinity, NaN, '1'])('rejects invalid elapsed time %j', (timeElapsed) => {
    expect(() => answerInput({ ...answer, timeElapsed })).toThrow(DomainError)
  })

  it('rejects impossible counter shapes without imposing an anti-cheat timer', () => {
    const input = {
      sessionId, questionsAnswered: 1, correctAnswers: 1, streaksCompleted: 0,
      finalTimeRemaining: 0, heartsRemaining: 5,
    }
    expect(endInput(input)).toMatchObject(input)
    expect(() => endInput({ ...input, heartsRemaining: 4.75 })).toThrow(DomainError)
    expect(() => endInput({ ...input, streaksCompleted: 6 })).toThrow(DomainError)
    expect(() => endInput({ ...input, questionsAnswered: 0.5 })).toThrow(DomainError)
    expect(answerInput({ ...answer, timeElapsed: 1000 }).timeElapsed).toBe(1000)
  })
})

describe('Function JSON boundary', () => {
  it('returns one JSON encoding of the canonical success envelope', async () => {
    const response = await functionResult('{"value":1}', async (input) => input)
    expect(JSON.parse(response)).toEqual({ success: true, data: { value: 1 } })
  })

  it('returns explicit validation, row, and retryable failure envelopes', async () => {
    const badJson = await functionResult('{', async () => 'unexpected')
    expect(JSON.parse(badJson)).toMatchObject({ success: false, code: 'VALIDATION_ERROR', retryable: false })
    const failure = await functionResult('{}', async () => {
      throw new DomainError('CSV_ERROR', 'Invalid row', true, [{ row: 2, message: 'Missing answer' }])
    })
    expect(JSON.parse(failure)).toEqual({
      success: false, code: 'CSV_ERROR', errorMessage: 'Invalid row', retryable: true,
      validationErrors: [{ row: 2, message: 'Missing answer' }],
    })
  })

  it.each([
    new Error('attendee@example.test token=private-token'),
    'attendee@example.test token=private-token',
    { message: 'attendee@example.test', token: 'private-token' },
  ])('surfaces unexpected failures without exposing participant or token content', async (failure) => {
    try {
      await functionResult('{}', async () => { throw failure })
      throw new Error('Expected a failed invocation')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(DomainError)
      expect(error).not.toBe(failure)
      expect(error).toMatchObject({ message: 'The operation failed unexpectedly.' })
      expect(error).not.toHaveProperty('cause')
      expect(error).not.toHaveProperty('token')
      expect(String(error)).not.toContain('attendee@example.test')
      expect(String(error)).not.toContain('private-token')
    }
  })
})
