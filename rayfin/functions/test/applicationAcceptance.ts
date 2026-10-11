import type { FunctionResult, OperationMap } from '../src/contracts.js'

export type AuthenticatedAppInvoker = <K extends keyof OperationMap>(
  operation: K,
  input: OperationMap[K]['input'],
) => Promise<FunctionResult<OperationMap[K]['output']>>

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Application acceptance failed: ${message}`)
}

/**
 * Explicitly run with the deployed app's operator-authenticated Functions client.
 * Uses real application operations, leaves identifiable synthetic rows, and never runs in Jest.
 * Does not establish browser DAB denial, upload ceiling, or interrupted-transaction recovery.
 */
export async function runApplicationAcceptance(invoke: AuthenticatedAppInvoker): Promise<{
  poolId: string
  userId: string
  sessionId: string
  questionCount: number
  finalScore: number
}> {
  const nonce = crypto.randomUUID()
  const poolId = `acceptance-${nonce}`
  async function call<K extends keyof OperationMap>(
    operation: K,
    input: OperationMap[K]['input'],
  ): Promise<OperationMap[K]['output']> {
    const result = await invoke(operation, input)
    if (!result.success) throw new Error(`${operation}: ${result.code}: ${result.errorMessage}`)
    return result.data
  }
  const registration = { mode: 'new', requestId: nonce, country: 'Canada' } as const
  const player = await call('registerPlayer', registration)
  check(typeof player.secretCode === 'string', 'new registration must return a one-time secret code')
  const secretCode = player.secretCode
  const duplicatePlayer = await invoke('registerPlayer', registration)
  check(!duplicatePlayer.success && duplicatePlayer.code === 'PLAYER_ALREADY_CREATED',
    'registration replay must not reissue a secret code')
  const returningPlayer = await call('registerPlayer', {
    mode: 'returning', secretCode,
  })
  const publicPlayer = { ...player }
  delete publicPlayer.secretCode
  check(JSON.stringify(returningPlayer) === JSON.stringify(publicPlayer), 'returning secret code changed the player')
  const incorrectCode = await invoke('registerPlayer', {
    mode: 'returning', secretCode: 'ZZZZZ',
  })
  check(!incorrectCode.success && incorrectCode.code === 'PLAYER_VERIFICATION_FAILED', 'an incorrect secret code was accepted')

  const csvHeader = 'Category,Question,Answer1,Answer2,Answer3,Answer4,CorrectAnswerKey,Metadata,Pools'
  const csv = `${csvHeader}\n` + Array.from({ length: 101 }, (_, i) =>
    `Acceptance,Question ${i},Same,Same,Third,Fourth,1,raw ${i},${poolId}`).join('\n')
  const importRequest = { importId: crypto.randomUUID(), csv }
  const [imported, importReplay] = await Promise.all([
    call('importQuestions', importRequest),
    call('importQuestions', { ...importRequest, importId: importRequest.importId.toUpperCase() }),
  ])
  check(imported.acceptedCount === 101, 'import count')
  check(JSON.stringify(imported) === JSON.stringify(importReplay), 'import retry changed question identities')
  const additive = await call('importQuestions', { ...importRequest, importId: crypto.randomUUID(), allowDuplicateContent: true })
  check(!additive.questionIds.some((id) => imported.questionIds.includes(id)), 'separate import must be additive')
  const importConflict = await invoke('importQuestions', { ...importRequest, csv: csv + '\n' })
  check(!importConflict.success && importConflict.code === 'CONFLICT', 'importId cannot identify different input')

  // Slug membership must work before a display-pool row exists.
  const sessionId = crypto.randomUUID()
  const startRequest = { sessionId, userId: player.userId, poolId }
  const starts = await Promise.all([
    call('startSession', startRequest),
    call('startSession', { ...startRequest, sessionId: sessionId.toUpperCase(), userId: player.userId.toUpperCase() }),
  ])
  check(JSON.stringify(starts[0]) === JSON.stringify(starts[1]), 'concurrent starts created different sessions')
  await call('createPool', { slug: poolId.toUpperCase(), name: 'Synthetic acceptance pool' })
  check((await call('getPool', { slug: poolId })).id === poolId, 'pool slug mapping')
  const poolConflict = await invoke('createPool', { slug: poolId, name: 'Duplicate' })
  check(!poolConflict.success && poolConflict.code === 'CONFLICT', 'duplicate pool was accepted')
  const draw = await call('getSessionQuestions', { sessionId })
  check(draw.questions.length === 202, 'draw omitted questions beyond the first page or additive import')
  check(new Set(draw.questions.map((question) => question.questionId)).size === 202, 'snapshot ids are not unique')
  check(!draw.questions.some((question) => imported.questionIds.includes(question.questionId)), 'draw ids must identify snapshots')
  const mismatch = await invoke('startSession', { ...startRequest, poolId: 'different-pool' })
  check(!mismatch.success && mismatch.code === 'CONFLICT', 'start replay must match its pool')
  await call('importQuestions', {
    importId: crypto.randomUUID(),
    csv: `${csvHeader}\nAcceptance,Later question,A,B,C,D,0,,${poolId}`,
  })
  check(JSON.stringify(await call('getSessionQuestions', { sessionId })) === JSON.stringify(draw),
    'later imports changed an existing immutable draw')

  const requests = draw.questions.slice(0, 10).map((question) => ({
    sessionId, questionId: question.questionId, answerIndex: question.correctAnswerIndex,
    timeElapsed: 0.123456789, isCorrect: false,
  }))
  const pending = Promise.all(requests.map(async (answer) => {
    const [saved, repeated] = await Promise.all([
      call('submitAnswer', answer),
      call('submitAnswer', { ...answer, sessionId: answer.sessionId.toUpperCase(), questionId: answer.questionId.toUpperCase() }),
    ])
    check(JSON.stringify(saved) === JSON.stringify(repeated), 'duplicate answer changed its response or score')
    check(saved.pointsEarned === 10, 'server trusted client isCorrect instead of snapshot index')
  }))
  const ending = {
    sessionId, questionsAnswered: 10, correctAnswers: 10, streaksCompleted: 2,
    heartsRemaining: 5, finalTimeRemaining: 0, gameOverReason: 'timer.expired',
  }
  const earlyEnd = await invoke('endSession', ending)
  check(earlyEnd.success || earlyEnd.code === 'SESSION_NOT_READY' && earlyEnd.retryable,
    'answer/end race must persist all expected answers or explicitly wait')
  await pending
  const [result, repeatedResult] = await Promise.all([call('endSession', ending), call('endSession', ending)])
  check(JSON.stringify(result) === JSON.stringify(repeatedResult), 'completion was not idempotent')
  check(result.finalScore === 100 && result.questionsAnswered === 10 && result.correctAnswers === 10,
    'concurrent answers were lost or counted twice')
  const acceptedRetry = await call('submitAnswer', requests[0])
  check(acceptedRetry.pointsEarned === 10, 'accepted answer retry after completion failed')
  const differentAnswer = await invoke('submitAnswer', { ...requests[0], answerIndex: (requests[0].answerIndex + 1) % 4 })
  check(!differentAnswer.success && differentAnswer.code === 'CONFLICT', 'conflicting answer replay accepted')
  const lateQuestion = draw.questions[10]
  const lateAnswer = await invoke('submitAnswer', {
    ...requests[0], questionId: lateQuestion.questionId, answerIndex: lateQuestion.correctAnswerIndex,
  })
  check(!lateAnswer.success && lateAnswer.code === 'CONFLICT', 'completed session accepted a new answer')
  const incompatibleEnd = await invoke('endSession', { ...ending, questionsAnswered: 11 })
  check(!incompatibleEnd.success && incompatibleEnd.code === 'CONFLICT' && !incompatibleEnd.retryable,
    'incompatible completed replay must not reopen or retry forever')
  return { poolId, userId: player.userId, sessionId, questionCount: draw.questions.length, finalScore: result.finalScore }
}
