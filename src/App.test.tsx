import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { TextEncoder } from 'node:util'
import { OperationError } from './services/operationError'

Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true })

let authenticated = false
let authenticationFailure: string | null = null
const sessionListeners = new Set<() => void>()
const authenticationListeners = new Set<() => void>()
const signOut = jest.fn<() => Promise<void>>()
const signIn = jest.fn<() => Promise<void>>()
const invoke = jest.fn<(name: string, input: unknown) => Promise<unknown>>()
const track = jest.fn()
const readyConnection = {
  client: {
    auth: {
      getSession: () => ({ isAuthenticated: authenticated }),
      onSessionChange: (listener: () => void) => {
        sessionListeners.add(listener)
        return () => { sessionListeners.delete(listener) }
      },
      signOut,
    },
  },
}
const getConnection = jest.fn(async () => readyConnection)

jest.unstable_mockModule('@fabric-msft/svg-icons', () => ({
  Fabric32Color: () => null,
  Fabric32Filled: () => null,
  ...Object.fromEntries([
    'CopyJob32Item', 'DataWarehouse32Item', 'DataflowGen232Item', 'Environment32Item',
    'EventHouse32Item', 'EventSchemaSet32Item', 'Eventstream32Item', 'Experiments32Item',
    'FunctionSet32Item', 'KqlDatabase32Item', 'KqlQueryset32Item', 'Lakehouse32Item',
    'MirroredGenericDatabase32Item', 'Model32Item', 'Notebook32Item', 'PaginatedReport32Item',
    'Pipeline32Item', 'RealTimeDashboard32Item', 'Reflex32Item', 'Report32Item',
    'SemanticModel32Item', 'SparkJobDirection32Item', 'SqlDatabase32Item', 'Variables32Item',
  ].map(name => [name, () => null])),
}))
jest.unstable_mockModule('react-qr-code', () => ({
  default: ({ value }: { value: string }) => <svg data-testid="qr-code" data-value={value} />,
}))

jest.unstable_mockModule('./services/rayfinClient', () => ({
  getOperatorConnection: getConnection,
  getAuthenticationFailure: () => authenticationFailure,
  onAuthenticationFailure: (listener: () => void) => {
    authenticationListeners.add(listener)
    return () => { authenticationListeners.delete(listener) }
  },
  signInOperator: signIn,
  invokeOperation: invoke,
}))
jest.unstable_mockModule('./services/analyticsService', () => ({
  analytics: {
    identify: jest.fn(), track, setSession: jest.fn(), setPool: jest.fn(),
    resetTrackedEventCount: jest.fn(), getTrackedEventCount: () => 0,
    getDeliveryStatus: () => ({
      enabled: true, queuedCount: 0, deliveredCount: 0, droppedCount: 0,
      sending: false, retryAt: null, lastFailure: null, lastDeliveredAt: null,
    }),
    subscribeDeliveryStatus: () => () => {},
  },
}))

const { default: App } = await import('./App')
const player = {
  userId: 'player-1',
  name: 'Amber Query Crafter',
  country: 'Canada',
  createdAt: '2026-09-10T00:00:00Z',
  secretCode: 'ABCDE',
}
const pool = { id: 'fabric', name: 'Fabric', iconPath: '/pools/default.svg', isActive: true, displayOrder: 0 }
const originalFetch = globalThis.fetch

beforeEach(() => {
  authenticated = false
  authenticationFailure = null
  sessionListeners.clear()
  authenticationListeners.clear()
  getConnection.mockReset().mockResolvedValue(readyConnection)
  invoke.mockReset()
  track.mockClear()
  signIn.mockReset().mockImplementation(async () => {
    authenticated = true
    authenticationFailure = null
    sessionListeners.forEach(listener => listener())
    authenticationListeners.forEach(listener => listener())
  })
  signOut.mockReset().mockImplementation(async () => {
    authenticated = false
    sessionListeners.forEach(listener => listener())
  })
  Object.defineProperty(window.crypto, 'randomUUID', { value: randomUUID, configurable: true })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn(() => ({ matches: true })),
  })
  HTMLElement.prototype.scrollIntoView = jest.fn()
  window.scrollTo = jest.fn()
  window.history.replaceState(null, '', '/signin')
})

afterEach(() => {
  cleanup()
  jest.useRealTimers()
  globalThis.fetch = originalFetch
})

async function registerAttendee() {
  await selectCountry()
  fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Begin trivia' }))
}

async function selectCountry(country = 'Canada') {
  await screen.findByRole('form', { name: 'Adventurer entry' })
  let countryButton = screen.queryByRole('button', { name: /Choose your country/i })
  if (!countryButton) {
    fireEvent.click(screen.getByRole('button', { name: /Forgot your code\? Start a new challenge/ }))
    countryButton = await screen.findByRole('button', { name: /Choose your country/i })
  }
  fireEvent.click(countryButton)
  fireEvent.change(screen.getByRole('combobox', { name: 'Search countries' }), { target: { value: country } })
  fireEvent.click(screen.getByRole('option', { name: country, exact: true }))
}

async function fillReturning(secretCode = 'ABCDE') {
  if (!screen.queryByLabelText('Secret code')) {
    fireEvent.click(await screen.findByRole('button', { name: 'Have your secret code? Enter it here' }))
  }
  fireEvent.change(await screen.findByLabelText('Secret code'), { target: { value: secretCode } })
}

function expectNoOperatorTools() {
  expect(screen.queryByRole('button', { name: 'Operator setup' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sign out operator' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Load questions and create pools' })).not.toBeInTheDocument()
  expect(screen.queryByText(/^Telemetry:/)).not.toBeInTheDocument()
}

function navigateInApp(path: string) {
  act(() => {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

describe('ported attendee flow', () => {
  it('requires explicit operator sign-in, retains it between attendees, and waits for saved results', async () => {
    let sessionId = ''
    let acceptAnswer!: (value: unknown) => void
    const pendingAnswer = new Promise(resolve => { acceptAnswer = resolve })
    invoke.mockImplementation(async (name, input) => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      if (name === 'startSession') {
        if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') throw new Error('Missing stable session ID')
        sessionId = input.sessionId
        return { sessionId, userId: player.userId, poolId: pool.id, seed: 42, startTime: '2026-09-10T00:00:00Z', status: 'active' }
      }
      if (name === 'getSessionQuestions') return {
        questions: [{ questionId: 'q1', questionText: 'Which answer is correct?', category: 'Fabric', choices: ['Correct choice', 'Choice two', 'Choice three', 'Choice four'], correctAnswerIndex: 0 }],
      }
      if (name === 'submitAnswer') return pendingAnswer
      if (name === 'endSession') return {
        sessionId, finalScore: 10, questionsAnswered: 1, correctAnswers: 1,
        accuracy: 100, streaksCompleted: 0, heartsRemaining: 5,
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    const operatorButton = await screen.findByRole('button', { name: 'Sign in operator with Fabric' })
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Operator sign-in required' })).toBeInTheDocument()
    expectNoOperatorTools()
    fireEvent.click(operatorButton)
    await registerAttendee()
    const begin = await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(window.location.pathname).toBe('/instructions')
    expectNoOperatorTools()
    jest.useFakeTimers()
    fireEvent.click(begin)
    await screen.findByText('3')
    act(() => jest.advanceTimersByTime(3000))
    expect(screen.getByText('Which answer is correct?')).toBeInTheDocument()
    expectNoOperatorTools()
    navigateInApp('/operator')
    await waitFor(() => expect(window.location.pathname).toBe('/playing'))
    expect(screen.getByText('Which answer is correct?')).toBeInTheDocument()
    expectNoOperatorTools()
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })
    act(() => jest.advanceTimersByTime(500))
    await screen.findByRole('heading', { name: 'Saving your results' })
    expect(invoke.mock.calls.some(([name]) => name === 'endSession')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Play Again' })).not.toBeInTheDocument()
    navigateInApp('/operator')
    await waitFor(() => expect(window.location.pathname).toBe('/results'))
    expectNoOperatorTools()
    expect(invoke.mock.calls.some(([name]) => name === 'endSession')).toBe(false)
    await act(async () => { acceptAnswer({ totalScore: 10, pointsEarned: 10 }) })
    const playAgain = await screen.findByRole('button', { name: 'Play Again' })
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    expect(screen.getByText('Please allow others to play next (click Reset) if there is a line behind you.')).toBeInTheDocument()
    expectNoOperatorTools()
    expect(invoke.mock.calls.filter(([name]) => name === 'endSession')).toHaveLength(1)
    expect(screen.getAllByTestId('qr-code').map(code => code.getAttribute('data-value'))).toEqual([
      'https://aka.ms/trivia-powerbi', 'https://aka.ms/fabrictrivia/f', 'https://aka.ms/eu/cert',
    ])
    fireEvent.click(playAgain)
    const beginAgain = await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(window.location.pathname).toBe('/instructions')
    expect(invoke.mock.calls.filter(([name]) => name === 'registerPlayer')).toHaveLength(1)
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(signOut).not.toHaveBeenCalled()
    expectNoOperatorTools()
    const firstSessionId = sessionId
    fireEvent.click(beginAgain)
    await screen.findByText('3')
    expect(sessionId).not.toBe(firstSessionId)
    expect(invoke.mock.calls.filter(([name]) => name === 'startSession').map(([, input]) => input)).toEqual([
      expect.objectContaining({ userId: player.userId }), expect.objectContaining({ userId: player.userId }),
    ])
  })

  it('resets to an empty entry form for the next attendee while keeping the operator session', async () => {
    authenticated = true
    let sessionId = ''
    invoke.mockImplementation(async (name, input) => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      if (name === 'startSession') {
        if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') throw new Error('Missing session ID')
        sessionId = input.sessionId
        return { sessionId, userId: player.userId, poolId: pool.id, seed: 42, startTime: '2026-09-10T00:00:00Z', status: 'active' }
      }
      if (name === 'getSessionQuestions') return {
        questions: [{ questionId: 'q1', questionText: 'Only question', category: 'Fabric', choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0 }],
      }
      if (name === 'submitAnswer') return { totalScore: 10, pointsEarned: 10 }
      if (name === 'endSession') return {
        sessionId, finalScore: 10, questionsAnswered: 1, correctAnswers: 1,
        accuracy: 100, streaksCompleted: 0, heartsRemaining: 5,
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await registerAttendee()
    const begin = await screen.findByRole('button', { name: 'Begin Your Quest' })
    jest.useFakeTimers()
    fireEvent.click(begin)
    await screen.findByText('3')
    act(() => jest.advanceTimersByTime(3000))
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })
    act(() => jest.advanceTimersByTime(500))
    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }))
    await screen.findByRole('heading', { name: 'Start a new challenge' })
    expect(window.location.pathname).toBe('/signin')
    expect(screen.getByRole('button', { name: /Choose your country/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Secret code')).not.toBeInTheDocument()
    expect(screen.queryByText(player.name)).not.toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
    expectNoOperatorTools()
  })

  it('restores an operator session without opening a popup and keeps multiple-pool selection', async () => {
    authenticated = true
    invoke.mockImplementation(async name => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool, { ...pool, id: 'analytics', name: 'Analytics' }]
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await registerAttendee()
    await screen.findByRole('heading', { name: 'Choose Your Challenge' })
    expectNoOperatorTools()
    expect(screen.getByRole('button', { name: 'Analytics' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Analytics' }))
    await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('keeps the attendee form mounted when the operator session expires', async () => {
    authenticated = true
    render(<App />)
    await fillReturning()
    act(() => {
      authenticated = false
      sessionListeners.forEach(listener => listener())
    })
    await screen.findByText(/operator session needs attention/i)
    expectNoOperatorTools()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in operator with Fabric' }))
    await waitFor(() => expect(screen.getByLabelText('Secret code')).toHaveValue('ABCDE'))
    expect(signOut).not.toHaveBeenCalled()
  })

  it('keeps an in-progress game and pending answer across operator expiry and explicit retry', async () => {
    authenticated = true
    let sessionId = ''
    let rejectAnswer!: (error: Error) => void
    const pendingAnswer = new Promise((_, reject) => { rejectAnswer = reject })
    const submittedAnswers: unknown[] = []
    invoke.mockImplementation(async (name, input) => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      if (name === 'startSession') {
        if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') throw new Error('Missing session ID')
        sessionId = input.sessionId
        return { sessionId, userId: player.userId, poolId: pool.id, seed: 42, startTime: '2026-09-10T00:00:00Z', status: 'active' }
      }
      if (name === 'getSessionQuestions') return {
        questions: [{ questionId: 'q1', questionText: 'Question before expiry', category: 'Fabric', choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0 }],
      }
      if (name === 'submitAnswer') {
        submittedAnswers.push(input)
        return submittedAnswers.length === 1 ? pendingAnswer : { totalScore: 10, pointsEarned: 10 }
      }
      if (name === 'endSession') return {
        sessionId, finalScore: 10, questionsAnswered: 1, correctAnswers: 1,
        accuracy: 100, streaksCompleted: 0, heartsRemaining: 5,
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await registerAttendee()
    const begin = await screen.findByRole('button', { name: 'Begin Your Quest' })
    jest.useFakeTimers()
    fireEvent.click(begin)
    await screen.findByText('3')
    act(() => jest.advanceTimersByTime(3000))
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })
    await act(async () => {
      authenticated = false
      sessionListeners.forEach(listener => listener())
      rejectAnswer(new OperationError('Operator session expired', 'OPERATOR_SIGN_IN_REQUIRED', false))
    })
    await screen.findByText(/operator session needs attention/i)
    expectNoOperatorTools()
    act(() => jest.advanceTimersByTime(500))
    expect(screen.getByText('Your game could not be saved')).toBeInTheDocument()
    expect(invoke.mock.calls.some(([name]) => name === 'endSession')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in operator with Fabric' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry saving results' }))
    await screen.findByRole('button', { name: 'Play Again' })
    expect(submittedAnswers).toHaveLength(2)
    expect(submittedAnswers[0]).toEqual(submittedAnswers[1])
    for (const operation of ['registerPlayer', 'startSession', 'getSessionQuestions', 'endSession']) {
      expect(invoke.mock.calls.filter(([name]) => name === operation)).toHaveLength(1)
    }
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(signOut).not.toHaveBeenCalled()
  })

  it('reuses the start request ID when retrying an interrupted game start', async () => {
    authenticated = true
    const requests: string[] = []
    invoke.mockImplementation(async (name, input) => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      if (name === 'startSession') {
        if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') throw new Error('Missing session ID')
        requests.push(input.sessionId)
        if (requests.length === 1) throw new Error('Connection interrupted')
        return { sessionId: input.sessionId, userId: player.userId, poolId: pool.id, seed: 42, startTime: '2026-09-10T00:00:00Z', status: 'active' }
      }
      if (name === 'getSessionQuestions') return {
        questions: [{ questionId: 'q1', questionText: 'Question', category: 'Fabric', choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0 }],
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await registerAttendee()
    fireEvent.click(await screen.findByRole('button', { name: 'Begin Your Quest' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry this game' }))
    await screen.findByText('3')
    expect(requests).toHaveLength(2)
    expect(requests[0]).toBe(requests[1])
  })

  it('does not unmount a starting game when operator setup is requested before the session is returned', async () => {
    authenticated = true
    let sessionId = ''
    let finishStart!: (value: unknown) => void
    const pendingStart = new Promise(resolve => { finishStart = resolve })
    invoke.mockImplementation(async (name, input) => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      if (name === 'startSession') {
        if (!input || typeof input !== 'object' || !('sessionId' in input) || typeof input.sessionId !== 'string') throw new Error('Missing session ID')
        sessionId = input.sessionId
        return pendingStart
      }
      if (name === 'getSessionQuestions') return {
        questions: [{ questionId: 'q1', questionText: 'Question after setup attempt', category: 'Fabric', choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0 }],
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await registerAttendee()
    const begin = await screen.findByRole('button', { name: 'Begin Your Quest' })
    jest.useFakeTimers()
    fireEvent.click(begin)
    await waitFor(() => expect(sessionId).not.toBe(''))
    navigateInApp('/operator')
    await waitFor(() => expect(window.location.pathname).toBe('/playing'))
    expectNoOperatorTools()
    await act(async () => {
      finishStart({ sessionId, userId: player.userId, poolId: pool.id, seed: 42, startTime: '2026-09-10T00:00:00Z', status: 'active' })
    })
    await screen.findByText('3')
    act(() => jest.advanceTimersByTime(3000))
    expect(screen.getByText('Question after setup attempt')).toBeInTheDocument()
    for (const operation of ['startSession', 'getSessionQuestions']) {
      expect(invoke.mock.calls.filter(([name]) => name === operation)).toHaveLength(1)
    }
    expect(signOut).not.toHaveBeenCalled()
  })

  it('offers question loading and retries the same import ID before showing accepted counts', async () => {
    authenticated = true
    const imports: unknown[] = []
    invoke.mockImplementation(async (name, input) => {
      if (name === 'listPools') return [pool]
      if (name === 'previewQuestionImport') {
        if (!input || typeof input !== 'object' || !('importId' in input)) throw new Error('Missing import ID')
        return { importId: input.importId, questionCount: 1, previousImportCount: 0,
          pools: [{ slug: pool.id, questionCount: 1, existingPool: pool }] }
      }
      if (name === 'importQuestions') {
        imports.push(input)
        if (imports.length === 1) throw new Error('Import connection interrupted')
        if (!input || typeof input !== 'object' || !('importId' in input)) throw new Error('Missing import ID')
        return { importId: input.importId, acceptedCount: 1, questionIds: ['imported-question'] }
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    window.history.replaceState(null, '', '/operator')
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Load questions and create pools' }))
    expect(await screen.findByRole('heading', { name: 'Load questions' })).toBeInTheDocument()
    const file = new File(['csv fixture'], 'questions.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', { value: async () => 'csv fixture' })
    // A file at the existing 10 MiB limit must not hit a smaller frontend cap.
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Question file'), { target: { files: [file] } })
    await screen.findByRole('heading', { name: 'Import preview' })
    fireEvent.click(screen.getByRole('button', { name: 'Import questions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry this import' }))
    await screen.findByText('Import complete. 1 question accepted.')
    expect(imports).toHaveLength(2)
    expect(imports[0]).toEqual(imports[1])
    expect(screen.getByRole('button', { name: 'Import questions' })).toBeDisabled()
    fireEvent.click(screen.getByRole('link', { name: 'Back to operator setup' }))
    await screen.findByRole('heading', { name: 'Kiosk operator setup' })
    expect(window.location.pathname).toBe('/operator')
    expect(signIn).not.toHaveBeenCalled()
  })

  it('requires explicit pool creation and duplicate confirmation before an additive import', async () => {
    authenticated = true
    invoke.mockImplementation(async (name, input) => {
      if (name === 'listPools') return []
      if (!input || typeof input !== 'object' || !('importId' in input)) throw new Error('Missing import ID')
      if (name === 'previewQuestionImport') return {
        importId: input.importId, questionCount: 2, previousImportCount: 1,
        pools: [{ slug: 'demo', questionCount: 2 }, { slug: 'fabric', questionCount: 1, existingPool: pool }],
      }
      if (name === 'importQuestions') return {
        importId: input.importId, acceptedCount: 2, questionIds: ['q1', 'q2'],
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    window.history.replaceState(null, '', '/questions/load')
    render(<App />)
    const file = new File(['csv fixture'], 'questions.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', { value: async () => 'csv fixture' })
    fireEvent.change(await screen.findByLabelText('Question file'), { target: { files: [file] } })
    await screen.findByRole('heading', { name: 'Import preview' })
    expect(screen.getByText(/already been imported 1 time/)).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Import questions' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Display name for demo'), { target: { value: 'Demo pool' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Create 1 missing pool/ }))
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add another copy of these questions.' }))
    fireEvent.click(submit)
    await screen.findByText('Import complete. 2 questions accepted.')
    expect(invoke).toHaveBeenCalledWith('importQuestions', expect.objectContaining({
      csv: 'csv fixture',
      poolsToCreate: [{ slug: 'demo', name: 'Demo pool', iconPath: '/pools/default.svg' }],
      allowDuplicateContent: true,
    }))
    expect(invoke.mock.calls.filter(([name]) => name === 'createPool')).toHaveLength(0)
  })

  it('seeds through the same authenticated preview and import without automatic writes', async () => {
    authenticated = true
    const csv = readFileSync(new URL('../examples/questions.csv', import.meta.url), 'utf8')
    const fetchSample = jest.fn(async () => ({ ok: true, text: async () => csv }))
    Object.defineProperty(globalThis, 'fetch', { value: fetchSample, configurable: true, writable: true })
    invoke.mockImplementation(async (name, input) => {
      if (name === 'listPools') return []
      if (!input || typeof input !== 'object' || !('importId' in input)) throw new Error('Missing import ID')
      if (name === 'previewQuestionImport') return {
        importId: input.importId, questionCount: 4, previousImportCount: 0,
        pools: [{ slug: 'fabric-basics', questionCount: 4 }],
      }
      if (name === 'importQuestions') return {
        importId: input.importId, acceptedCount: 4, questionIds: ['q1', 'q2', 'q3', 'q4'],
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    window.history.replaceState(null, '', '/questions/load')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Use sample questions' }))
    await screen.findByRole('heading', { name: 'Import preview' })
    expect(fetchSample).toHaveBeenCalledTimes(1)
    expect(invoke.mock.calls.filter(([name]) => name === 'importQuestions')).toHaveLength(0)
    fireEvent.click(screen.getByRole('checkbox', { name: /Create 1 missing pool/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Import questions' }))
    await screen.findByText('Import complete. 4 questions accepted.')
    expect(invoke).toHaveBeenCalledWith('importQuestions', expect.objectContaining({
      csv, poolsToCreate: [{ slug: 'fabric-basics', name: 'fabric basics', iconPath: '/pools/default.svg' }],
      allowDuplicateContent: false,
    }))
  })

  it('refreshes a stale preview after another import, retaining the identity until explicit confirmation', async () => {
    authenticated = true
    let previews = 0
    let imports = 0
    invoke.mockImplementation(async (name, input) => {
      if (name === 'listPools') return [pool]
      if (!input || typeof input !== 'object' || !('importId' in input)) throw new Error('Missing import ID')
      if (name === 'previewQuestionImport') return {
        importId: input.importId, questionCount: 1, previousImportCount: previews++,
        pools: [{ slug: 'fabric', questionCount: 1, existingPool: pool }],
      }
      if (name === 'importQuestions') {
        if (imports++ === 0) throw new OperationError('This file has already been imported.', 'DUPLICATE_IMPORT', false)
        return { importId: input.importId, acceptedCount: 1, questionIds: ['q1'] }
      }
      throw new Error(`Unexpected operation ${name}`)
    })
    window.history.replaceState(null, '', '/questions/load')
    render(<App />)
    const file = new File(['csv'], 'questions.csv')
    Object.defineProperty(file, 'text', { value: async () => 'csv' })
    fireEvent.change(await screen.findByLabelText('Question file'), { target: { files: [file] } })
    await screen.findByRole('heading', { name: 'Import preview' })
    fireEvent.click(screen.getByRole('button', { name: 'Import questions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Review this import again' }))
    await screen.findByText(/already been imported 1 time/)
    expect(screen.getByRole('button', { name: 'Import questions' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add another copy of these questions.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Import questions' }))
    await screen.findByText('Import complete. 1 question accepted.')
    const requests = invoke.mock.calls.filter(([name]) => name === 'importQuestions').map(([, input]) => input)
    expect(requests).toHaveLength(2)
    const firstRequest = requests[0]
    if (!firstRequest || typeof firstRequest !== 'object') throw new Error('Missing first request')
    expect(requests[1]).toEqual({ ...firstRequest, allowDuplicateContent: true })
  })
})

describe('operator-only setup page', () => {
  it('supports a direct /operator bookmark and stays there after sign-in until staff continue', async () => {
    window.history.replaceState(null, '', '/operator/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Kiosk operator setup' })
    expect(screen.queryByRole('link', { name: 'Load questions and create pools' })).not.toBeInTheDocument()
    expect(invoke).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in operator with Fabric' }))
    await screen.findByText('Operator signed in. This session is retained between attendees.')
    expect(window.location.pathname).toBe('/operator/')
    expect(screen.getByRole('link', { name: 'Load questions and create pools' })).toHaveAttribute('href', '/questions/load')
    expect(screen.getByText('Telemetry: enabled.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Continue to the challenge' }))
    await screen.findByRole('heading', { name: 'Start a new challenge' })
    expect(window.location.pathname).toBe('/signin')
    expectNoOperatorTools()
    expect(signIn).toHaveBeenCalledTimes(1)
  })

})

describe('adventurer names and secret codes', () => {
  it('starts on new challenge, reveals a one-time code, and keeps it out of player state and telemetry', async () => {
    authenticated = true
    invoke.mockImplementation(async name => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await screen.findByRole('heading', { name: 'Start a new challenge' })
    expect(screen.getByRole('img', { name: 'QR code for the Terms and Conditions' })).toHaveAttribute('src', '/terms-qr.png')
    expect(screen.queryByRole('link', { name: /Terms and Conditions/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Adventurer name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Item runes' })).not.toBeInTheDocument()
    for (const field of [/^Email/, /^Phone/, /^State/, /^City/]) {
      expect(screen.queryByLabelText(field)).not.toBeInTheDocument()
    }

    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
    expect(screen.getByRole('heading', { name: "You're in, adventurer" })).toBeInTheDocument()
    expect(screen.getByLabelText('Adventurer name')).toHaveTextContent(player.name)
    expect(screen.getByLabelText('Secret code')).toHaveTextContent('ABCDE')
    expect(screen.getByText(/Take a photo of your ticket/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Adventurer' })).toHaveFocus()
    expect(invoke).toHaveBeenCalledWith('registerPlayer', {
      mode: 'new',
      requestId: expect.any(String),
      country: 'Canada',
    })
    expect(JSON.stringify(invoke.mock.calls)).not.toMatch(/password|runes/i)
    expect(invoke.mock.calls.filter(([name]) => name === 'listPools')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Begin trivia' }))
    await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(track).toHaveBeenCalledWith(
      'user.register',
      {
        userId: player.userId,
        name: player.name,
        country: 'Canada',
        entryMode: 'new',
      },
      { page: 'signin' }
    )
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/ABCDE|secretCode|password|requestId/i)
  })

  it('requires a manual country choice from the approved list before creating an adventurer', async () => {
    authenticated = true
    invoke.mockResolvedValueOnce(player)
    render(<App />)
    const start = await screen.findByRole('button', { name: 'Start a new challenge' })
    expect(start).toBeDisabled()
    const country = screen.getByRole('button', { name: /Choose your country/i })
    expect(country).toHaveTextContent('Choose your country')
    fireEvent.click(country)
    fireEvent.change(screen.getByRole('combobox', { name: 'Search countries' }), { target: { value: 'Canada, Ontario' } })
    expect(screen.getByText('No countries match.')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search countries' }), { key: 'Enter' })
    fireEvent.submit(screen.getByRole('form', { name: 'Adventurer entry' }))
    expect(invoke).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search countries' }), { key: 'Escape' })
    expect(country).toHaveFocus()
    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
    expect(invoke).toHaveBeenCalledWith('registerPlayer', expect.objectContaining({ country: 'Canada' }))
  })

  it('offers ASCII country names and submits the chosen spelling unchanged', async () => {
    authenticated = true
    invoke.mockResolvedValueOnce({ ...player, country: "Cote d'Ivoire" })
    render(<App />)
    await selectCountry("Cote d'Ivoire")
    expect(screen.getByRole('button', { name: /Choose your country/i })).toHaveTextContent("Cote d'Ivoire")
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
    expect(invoke).toHaveBeenCalledWith('registerPlayer', expect.objectContaining({
      country: "Cote d'Ivoire",
    }))
    expect(document.body).not.toHaveTextContent('Côte d’Ivoire')
  })

  it('verifies a returning player with a masked secret code and clears a mismatch', async () => {
    authenticated = true
    let entries = 0
    invoke.mockImplementation(async name => {
      if (name === 'registerPlayer') {
        if (entries++ === 0)
          throw new OperationError(
            "That secret code didn't match an adventurer.",
            'PLAYER_VERIFICATION_FAILED',
            false
          )
        return player
      }
      if (name === 'listPools') return [pool]
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await fillReturning('ab-cde')
    const code = screen.getByLabelText('Secret code')
    expect(code).toHaveAttribute('type', 'text')
    expect(code).toHaveAttribute('autocomplete', 'off')
    expect(code).toHaveAttribute('autocapitalize', 'characters')
    expect(code).toHaveValue('ABCDE')
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Adventurer entry' })).toHaveTextContent('*****')
    expect(screen.getByRole('form', { name: 'Adventurer entry' })).not.toHaveTextContent('ABCDE')
    expect(screen.queryByLabelText('Adventurer name')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText("That secret code didn't match an adventurer. Check your photo and try again, or start a new challenge.")
    expect(invoke).toHaveBeenCalledWith('registerPlayer', {
      mode: 'returning',
      secretCode: 'ABCDE',
    })
    expect(screen.getByLabelText('Secret code')).toHaveValue('')
    expect(screen.getByLabelText('Secret code')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText('Secret code')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(invoke.mock.calls.filter(([name]) => name === 'listPools')).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Secret code'), { target: { value: 'ABCDE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(track).toHaveBeenCalledWith(
      'user.register',
      {
        userId: player.userId,
        name: player.name,
        country: 'Canada',
        entryMode: 'returning',
      },
      { page: 'signin' }
    )
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/ABCDE|secretCode|password/i)
  })

  it('validates a returning code before calling the backend', async () => {
    authenticated = true
    render(<App />)
    await fillReturning('ABCD')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your 5-character secret code.')
    expect(screen.getByLabelText('Secret code')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText('Secret code')).toHaveFocus())
    expect(invoke).not.toHaveBeenCalled()
  })

  it('switches between new and returning entry without preserving typed codes', async () => {
    authenticated = true
    render(<App />)
    await fillReturning('ABCDE')
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your code? Start a new challenge' }))
    expect(screen.getByRole('heading', { name: 'Start a new challenge' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Secret code')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Have your secret code? Enter it here' }))
    expect(screen.getByLabelText('Secret code')).toHaveValue('')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('supports country selection with the keyboard', async () => {
    authenticated = true
    render(<App />)
    await screen.findByRole('form', { name: 'Adventurer entry' })
    fireEvent.click(screen.getByRole('button', { name: /Choose your country/i }))
    const search = screen.getByRole('combobox', { name: 'Search countries' })
    expect(search).toHaveFocus()
    fireEvent.change(search, { target: { value: 'Canada' } })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(screen.getByRole('button', { name: /Choose your country/i })).toHaveTextContent('Canada')
  })

  it('prevents concurrent verification while a returning entry is checked', async () => {
    authenticated = true
    let finish!: (value: unknown) => void
    invoke.mockImplementation(async name => {
      if (name === 'registerPlayer') return new Promise(resolve => { finish = resolve })
      if (name === 'listPools') return [pool]
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await fillReturning()
    fireEvent.submit(screen.getByRole('form', { name: 'Adventurer entry' }))
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('form', { name: 'Adventurer entry' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Checking your secret code...')).toBeInTheDocument()
    expect(screen.getByLabelText('Secret code')).toBeDisabled()
    fireEvent.submit(screen.getByRole('form', { name: 'Adventurer entry' }))
    expect(invoke).toHaveBeenCalledTimes(1)
    await act(async () => { finish(player) })
    await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(invoke.mock.calls.filter(([name]) => name === 'registerPlayer')).toHaveLength(1)
  })

  it('keeps the returning code after a connection failure and retries only on an explicit request', async () => {
    authenticated = true
    invoke.mockRejectedValueOnce(new OperationError('Connection interrupted.', 'NETWORK_ERROR', true))
    invoke.mockImplementation(async name => {
      if (name === 'registerPlayer') return player
      if (name === 'listPools') return [pool]
      throw new Error(`Unexpected operation ${name}`)
    })
    render(<App />)
    await fillReturning()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted.')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Secret code')).toHaveValue('ABCDE')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('button', { name: 'Begin Your Quest' })
    expect(invoke.mock.calls.filter(([name]) => name === 'registerPlayer')).toHaveLength(2)
  })

  it('retries the exact creation request without issuing a second identity', async () => {
    authenticated = true
    invoke.mockRejectedValueOnce(
      new OperationError('Connection interrupted. Retry the same request.', 'NETWORK', true)
    )
    invoke.mockResolvedValueOnce(player)
    render(<App />)
    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByText('Connection interrupted. Retry the same request.')
    expect(screen.getByRole('button', { name: /Choose your country/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Have your secret code? Enter it here' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
    const requests = invoke.mock.calls
      .filter(([name]) => name === 'registerPlayer')
      .map(([, input]) => input)
    expect(requests).toHaveLength(2)
    expect(requests[1]).toBe(requests[0])
    expect(screen.getByLabelText('Adventurer name')).toHaveTextContent(player.name)
  })

  it('does not retry a creation whose one-time code was already issued', async () => {
    authenticated = true
    invoke.mockRejectedValueOnce(
      new OperationError(
        'This adventurer was already created, and its secret code can only be shown once. Start a new challenge.',
        'PLAYER_ALREADY_CREATED',
        false
      )
    )
    render(<App />)
    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Start a new challenge' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Choose your country/i })).toBeEnabled()
  })

  it('lets an attendee abandon a failed creation and start over with a new request', async () => {
    authenticated = true
    invoke.mockRejectedValueOnce(new OperationError('Connection interrupted.', 'NETWORK', true))
    invoke.mockResolvedValueOnce(player)
    render(<App />)
    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByText('Connection interrupted.')
    const startOver = screen
      .getAllByRole('button', { name: 'Start a new challenge' })
      .find(button => !button.hasAttribute('disabled'))
    if (!startOver) throw new Error('Missing start-over button')
    fireEvent.click(startOver)
    await selectCountry()
    fireEvent.click(screen.getByRole('button', { name: 'Start a new challenge' }))
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
    const requests = invoke.mock.calls
      .filter(([name]) => name === 'registerPlayer')
      .map(([, input]) => input as { requestId: string })
    expect(requests).toHaveLength(2)
    expect(requests[1].requestId).not.toBe(requests[0].requestId)
  })

  it('retains a stable in-flight creation and does not submit twice', async () => {
    authenticated = true
    let finish!: (value: unknown) => void
    invoke.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    render(<App />)
    await selectCountry()
    const form = screen.getByRole('form', { name: 'Adventurer entry' })
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Creating your adventurer...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Choose your country/i })).toBeDisabled()
    await act(async () => {
      finish(player)
    })
    await screen.findByRole('region', { name: 'Your adventurer is ready' })
  })

  it.each(['new', 'returning'])(
    'ignores a late %s entry response after leaving the form',
    async mode => {
      authenticated = true
      let finish!: (value: unknown) => void
      invoke.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve
          })
      )
      render(<App />)
      if (mode === 'returning') await fillReturning()
      else await selectCountry()
      fireEvent.submit(screen.getByRole('form', { name: 'Adventurer entry' }))
      expect(invoke).toHaveBeenCalledTimes(1)
      act(() => {
        window.history.pushState(null, '', '/operator')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      await screen.findByRole('heading', { name: 'Kiosk operator setup' })
      await act(async () => {
        finish(player)
      })
      expect(window.location.pathname).toBe('/operator')
      expect(invoke).toHaveBeenCalledTimes(1)
      expect(track.mock.calls.some(([event]) => event === 'user.register')).toBe(false)
      fireEvent.click(screen.getByRole('link', { name: 'Continue to the challenge' }))
      await screen.findByRole('heading', { name: 'Start a new challenge' })
      expect(screen.getByRole('button', { name: /Choose your country/i })).toBeInTheDocument()
      expect(screen.queryByLabelText('Secret code')).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Your adventurer is ready' })).not.toBeInTheDocument()
    }
  )
})

describe('operator setup recovery', () => {
  it('allows operator sign-out on /operator without exposing management controls afterward', async () => {
    authenticated = true
    window.history.replaceState(null, '', '/operator')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out operator' }))
    await screen.findByRole('button', { name: 'Sign in operator with Fabric' })
    expect(window.location.pathname).toBe('/operator')
    expect(signOut).toHaveBeenCalledTimes(1)
    expectNoOperatorTools()
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument()
  })

  it('offers minimal recovery for a rejected session even if the SDK still reports it authenticated', async () => {
    authenticated = true
    render(<App />)
    await fillReturning()
    act(() => {
      authenticationFailure = 'The operator session was rejected. Sign in again with Fabric.'
      authenticationListeners.forEach(listener => listener())
    })
    expect(authenticated).toBe(true)
    expect(screen.getByRole('dialog', { name: 'Operator sign-in required' })).toBeInTheDocument()
    expectNoOperatorTools()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in operator with Fabric' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Secret code')).toHaveValue('ABCDE')
    expect(signOut).not.toHaveBeenCalled()
    expectNoOperatorTools()
  })

  it('shows failed sign-in and allows retry without navigating or losing the attendee form', async () => {
    authenticated = true
    render(<App />)
    await fillReturning()
    act(() => {
      authenticated = false
      sessionListeners.forEach(listener => listener())
    })
    signIn.mockRejectedValueOnce(new Error('Fabric sign-in was cancelled'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in operator with Fabric' }))
    await screen.findByText('Fabric sign-in was cancelled')
    expectNoOperatorTools()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in operator with Fabric' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Secret code')).toHaveValue('ABCDE')
    expect(window.location.pathname).toBe('/signin')
  })

  it('retains configuration-error recovery on the dedicated operator page', async () => {
    window.history.replaceState(null, '', '/operator')
    getConnection.mockRejectedValueOnce(new Error('Fabric configuration could not be loaded'))
    render(<App />)
    await screen.findByText('Fabric configuration could not be loaded')
    expectNoOperatorTools()
    fireEvent.click(screen.getByRole('button', { name: 'Retry configuration' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in operator with Fabric' }))
    await screen.findByRole('link', { name: 'Continue to the challenge' })
    expect(window.location.pathname).toBe('/operator')
  })
})
