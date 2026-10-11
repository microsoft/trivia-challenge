import { describe, expect, it } from '@jest/globals'
import { operationResponseValidators as validate } from './operationResponses'

describe('Function response validation', () => {
  it('accepts generated identities but rejects contact data and private credential fields', () => {
    const player = {
      userId: 'player', name: 'Amber Query Crafter', country: 'Canada', createdAt: '2026-09-21T00:00:00Z',
    }
    expect(validate.registerPlayer(player)).toBe(true)
    expect(validate.registerPlayer({ ...player, secretCode: 'ABCDE' })).toBe(true)
    expect(validate.registerPlayer({ ...player, name: 'Amber Query Crafter 2' })).toBe(true)
    expect(validate.registerPlayer({ ...player, name: 'Amber Query Crafter 02' })).toBe(false)
    expect(validate.registerPlayer({ ...player, name: 'Real Person' })).toBe(false)
    expect(validate.registerPlayer({ ...player, playerCode: 'K042' })).toBe(false)
    expect(validate.registerPlayer({ ...player, secretCode: 'ABCD' })).toBe(false)
    expect(validate.registerPlayer({ ...player, secretCode: 'A-BCD-E' })).toBe(false)
    expect(validate.registerPlayer({ ...player, country: undefined })).toBe(false)
    expect(validate.registerPlayer({ ...player, country: 'Unlisted country' })).toBe(false)
    expect(validate.registerPlayer({ ...player, email: 'person@example.invalid' })).toBe(false)
    expect(validate.registerPlayer({ ...player, passwordHash: 'private' })).toBe(false)
    expect(validate.registerPlayer({ ...player, secretCodeHash: 'private' })).toBe(false)
  })

  it('accepts decoded canonical responses and rejects extra JSON encoding', () => {
    const answer = { pointsEarned: 10, totalScore: 20 }
    expect(validate.submitAnswer(answer)).toBe(true)
    expect(validate.submitAnswer(JSON.stringify(answer))).toBe(false)
    expect(validate.submitAnswer({ pointsEarned: 10, totalScore: '20' })).toBe(false)
  })

  it('rejects malformed question draws instead of entering a broken game', () => {
    const question = {
      questionId: 'question', questionText: 'Question?', category: 'Fabric',
      choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 2,
    }
    expect(validate.getSessionQuestions({ questions: [question] })).toBe(true)
    expect(validate.getSessionQuestions({ questions: [{ ...question, correctAnswerIndex: 4 }] })).toBe(false)
    expect(validate.getSessionQuestions({ questions: [{ ...question, choices: ['A'] }] })).toBe(false)
    expect(validate.getSessionQuestions({ questions: [null] })).toBe(false)
  })

  it('rejects partial import acknowledgments and missing saved scores', () => {
    expect(validate.importQuestions({ importId: 'import', acceptedCount: 1, questionIds: ['question'] })).toBe(true)
    expect(validate.importQuestions({ importId: 'import', acceptedCount: 2, questionIds: ['question'] })).toBe(false)
    expect(validate.endSession({ sessionId: 'session' })).toBe(false)
  })

  it('requires consistent pool counts and identities in an import preview', () => {
    const preview = {
      importId: 'import', questionCount: 2, previousImportCount: 0,
      pools: [{ slug: 'fabric', questionCount: 2 }],
    }
    expect(validate.previewQuestionImport(preview)).toBe(true)
    expect(validate.previewQuestionImport({ ...preview, pools: [] })).toBe(false)
    expect(validate.previewQuestionImport({ ...preview, previousImportCount: -1 })).toBe(false)
    expect(validate.previewQuestionImport({ ...preview, pools: [preview.pools[0], preview.pools[0]] })).toBe(false)
    expect(validate.previewQuestionImport({ ...preview, pools: [{ slug: 'fabric', questionCount: 3 }] })).toBe(false)
    expect(validate.previewQuestionImport({ ...preview, pools: [{ ...preview.pools[0], existingPool: {
      id: 'other', name: 'Other', iconPath: '/pools/default.svg', isActive: true, displayOrder: 0,
    } }] })).toBe(false)
  })
})
