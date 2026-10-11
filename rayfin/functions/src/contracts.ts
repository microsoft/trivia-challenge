export interface User {
  userId: string
  name: string
  country: string
  createdAt: string
}

export type RegisterUserRequest =
  | { mode: 'new'; requestId: string; country: string }
  | { mode: 'returning'; secretCode: string }

export type RegisteredPlayer = User & { secretCode?: string }

export type SessionStatus = 'active' | 'completed' | 'abandoned'

/**
 * Represents a question pool for organizing questions
 */
export interface QuestionPool {
  id: string
  name: string
  iconPath: string
  description?: string
  isActive: boolean
  displayOrder: number
}

export interface GameSession {
  sessionId: string
  userId: string
  seed: number
  poolId: string
  startTime: string
  status: SessionStatus
  totalScore?: number
  questionsAnswered?: number
  correctAnswers?: number
  streaksCompleted?: number
  heartsRemaining?: number
  gameOverReason?: string | null
}

export interface SessionQuestion {
  questionId: string
  questionText: string
  category: string
  choices: string[]
  correctAnswerIndex: number
  metadata?: Record<string, string>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  errorMessage?: string
  statusCode?: number
}

export interface StartSessionResponse {
  sessionId: string
  userId: string
  seed: number
  poolId: string
  startTime: string
  status: SessionStatus
}

export interface SessionQuestionsResponse {
  questions: SessionQuestion[]
}

export interface SubmitAnswerRequest {
  questionId: string
  answerIndex: number
  timeElapsed: number
  isCorrect: boolean
}

export interface SubmitAnswerResponse {
  pointsEarned: number
  totalScore: number
}

export interface EndSessionRequest {
  questionsAnswered: number
  correctAnswers: number
  streaksCompleted: number
  finalTimeRemaining: number
  heartsRemaining: number
  gameOverReason?: string
}

export interface EndSessionResponse {
  sessionId: string
  finalScore: number
  questionsAnswered: number
  correctAnswers: number
  accuracy: number
  streaksCompleted: number
  heartsRemaining: number
  gameOverReason?: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  questionsAnswered: number
  correctAnswers: number
  streaksCompleted: number
  date: string
}

export interface TelemetryEvent {
  eventId: string
  event: string
  type: string
  timestamp: string
  userId?: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface TelemetryTrackResponse {
  eventId: string
  processedAtUtc: string
  forwarded: boolean
  message?: string
}

export interface CreatePoolInput {
  slug: string
  name: string
  iconPath?: string
  description?: string
  isActive?: boolean
  displayOrder?: number
}

export interface ImportQuestionsInput {
  importId: string
  csv: string
  poolsToCreate?: CreatePoolInput[]
  allowDuplicateContent?: boolean
}

export interface ImportQuestionsPreview {
  importId: string
  questionCount: number
  previousImportCount: number
  pools: Array<{
    slug: string
    questionCount: number
    existingPool?: QuestionPool
  }>
}

export interface ImportQuestionsResponse {
  importId: string
  acceptedCount: number
  questionIds: string[]
}

export interface TelemetryBatchResponse {
  acknowledgedEventIds: string[]
  processedAtUtc: string
  forwarded: boolean
  message?: string
}

export type FunctionResult<T> =
  | { success: true; data: T }
  | {
    success: false
    code: string
    errorMessage: string
    retryable: boolean
    validationErrors?: Array<{ row: number; message: string }>
  }

export interface OperationMap {
  registerPlayer: { input: RegisterUserRequest; output: RegisteredPlayer }
  listPools: { input: Record<string, never>; output: QuestionPool[] }
  getPool: { input: { slug: string }; output: QuestionPool }
  createPool: { input: CreatePoolInput; output: QuestionPool }
  previewQuestionImport: {
    input: Pick<ImportQuestionsInput, 'importId' | 'csv'>
    output: ImportQuestionsPreview
  }
  importQuestions: { input: ImportQuestionsInput; output: ImportQuestionsResponse }
  startSession: {
    input: { sessionId: string; userId: string; poolId?: string }
    output: StartSessionResponse
  }
  getSessionQuestions: {
    input: { sessionId: string }
    output: SessionQuestionsResponse
  }
  submitAnswer: {
    input: SubmitAnswerRequest & { sessionId: string }
    output: SubmitAnswerResponse
  }
  endSession: {
    input: EndSessionRequest & { sessionId: string }
    output: EndSessionResponse
  }
  trackTelemetryBatch: {
    input: { events: TelemetryEvent[] }
    output: TelemetryBatchResponse
  }
}

export type AppFunctionsSchema = {
  [K in keyof OperationMap]: {
    input: { payload: string }
    output: FunctionResult<OperationMap[K]['output']>
  }
}
