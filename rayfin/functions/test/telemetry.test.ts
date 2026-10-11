import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { RayfinContext } from '@microsoft/fabric-user-data-functions'
import { MessagingError } from '@azure/event-hubs'
import type { CreateBatchOptions, EventData, SendBatchOptions } from '@azure/event-hubs'
import type { TelemetryBatchResponse, TelemetryEvent, User } from '../src/contracts.js'
import type { AnalyticsEventName } from '../../../src/types/telemetry'
import {
  TELEMETRY_LIMITS,
  forwardTelemetryEvents,
  telemetryEnvelope,
  trackTelemetryBatch,
  validateTelemetryBatch,
} from '../src/telemetry.js'
import type { TelemetryProducer } from '../src/telemetry.js'
import { functionResult } from '../src/errors.js'

const NOW = new Date('2026-09-10T13:00:00.000Z')
const EVENT_TYPES: Array<[AnalyticsEventName, string]> = [
  ['pageview.home', 'pageview'],
  ['pageview.select-pool', 'pageview'],
  ['pool.selected', 'user'],
  ['user.register', 'user'],
  ['game.start', 'game'],
  ['game.answerquestion', 'game'],
  ['game.streakcompleted', 'game'],
  ['game.ended', 'game'],
  ['page.click', 'interaction'],
  ['page.touch', 'interaction'],
  ['page.keyboardkeydown', 'interaction'],
]

function event(overrides: Partial<TelemetryEvent> = {}): TelemetryEvent {
  return {
    eventId: randomUUID(),
    event: 'game.start',
    type: 'game',
    timestamp: NOW.toISOString(),
    userId: 'participant-one',
    properties: { score: 10 },
    context: { sessionId: 'session-one', poolId: 'fabric', poolName: 'Fabric', stationId: 'station-one' },
    ...overrides,
  }
}

function acknowledge(events: TelemetryEvent[]): TelemetryBatchResponse {
  return {
    forwarded: true,
    acknowledgedEventIds: events.map(item => item.eventId),
    processedAtUtc: NOW.toISOString(),
  }
}

class FakeBatch {
  readonly events: EventData[] = []
  private readonly capacity: number
  constructor(capacity: number) { this.capacity = capacity }
  get count(): number { return this.events.length }
  tryAdd(item: EventData): boolean {
    if (this.events.length >= this.capacity) return false
    this.events.push(item)
    return true
  }
}

class FakeProducer implements TelemetryProducer<FakeBatch> {
  readonly sent: FakeBatch[] = []
  private readonly capacity: number
  constructor(capacity = 50) { this.capacity = capacity }
  createBatch = jest.fn(async (options: CreateBatchOptions) => {
    expect(options.maxSizeInBytes).toBe(TELEMETRY_LIMITS.producerBatchBytes)
    return new FakeBatch(this.capacity)
  })
  sendBatch = jest.fn(async (batch: FakeBatch, options: SendBatchOptions): Promise<void> => {
    expect(options.abortSignal).toBeDefined()
    this.sent.push(batch)
  })
  close = jest.fn(async (): Promise<void> => {})
}

describe('telemetry function validation and envelope', () => {
  it.each([
    { email: 'person@example.invalid' },
    { name: 'Real Person' },
    { phoneNumber: '123456' },
    { country: 'Country' },
    { nested: { country: 'Canada, Ontario' } },
    { state: 'Ontario' },
    { city: 'Toronto' },
    { latitude: 43.6 },
    { nested: { password: 'otter-42' } },
    { password_hash: 'private' },
    { secretCode: 'ABCDE' },
    { nested: { secretCodeHash: 'private' } },
  ])('rejects attendee details and credentials at the publisher boundary: %o', properties => {
    expect(() => validateTelemetryBatch({
      events: [event({ event: 'user.register', type: 'user', properties })],
    }, NOW)).toThrow()
  })

  it('accepts generated aliases and approved countries without accepting fingerprint fields', () => {
    expect(validateTelemetryBatch({
      events: [event({ event: 'user.register', type: 'user', properties: {
        name: 'Amber Query Crafter', country: 'Canada', entryMode: 'new',
      }, context: { country: 'Canada' } })],
    }, NOW)).toHaveLength(1)
    for (const field of ['userAgent', 'viewport', 'screen', 'language']) {
      expect(() => validateTelemetryBatch({ events: [event({ context: { [field]: 'private' } })] }, NOW)).toThrow()
    }
  })

  it('normalizes legacy country fields before publishing without changing other text or source events', () => {
    const original = event({
      event: 'user.register', type: 'user',
      properties: { country: 'Côte d’Ivoire', nested: [{ Country: 'Türkiye' }], label: 'Curaçao' },
      context: { country: 'Åland Islands' },
    })
    const [validated] = validateTelemetryBatch({ events: [original] }, NOW)
    expect(telemetryEnvelope(validated, NOW.toISOString())).toMatchObject({
      properties: { country: "Cote d'Ivoire", nested: [{ Country: 'Turkiye' }], label: 'Curaçao' },
      context: { country: 'Aland Islands' },
    })
    expect(original.properties?.country).toBe('Côte d’Ivoire')
    expect(original.context?.country).toBe('Åland Islands')
    expect(() => validateTelemetryBatch({
      events: [event({ context: { country: 'Cánada' } })],
    }, NOW)).toThrow()
  })

  it.each(EVENT_TYPES)('preserves %s with its existing envelope and attribution', (eventName, type) => {
    const original = event({ event: eventName, type })
    const [validated] = validateTelemetryBatch({ events: [original] }, NOW)
    expect(telemetryEnvelope(validated, NOW.toISOString())).toEqual({
      eventId: original.eventId,
      eventType: 'track',
      type,
      eventName,
      userId: original.userId,
      timestamp: original.timestamp,
      properties: original.properties,
      context: original.context,
      ingestedAtUtc: NOW.toISOString(),
    })
  })

  it('preserves the supplied timestamp, including its offset, and optional anonymous attribution', () => {
    const original = event({ timestamp: '2026-09-10T14:00:00+01:00' })
    delete original.userId
    delete original.context
    delete original.properties
    const [validated] = validateTelemetryBatch({ events: [original] }, NOW)
    expect(telemetryEnvelope(validated, NOW.toISOString())).toMatchObject({
      eventId: original.eventId,
      userId: null,
      timestamp: original.timestamp,
      context: {},
      properties: {},
    })
  })

  it.each([
    null, {}, { events: [] }, { events: 'bad' },
    { events: Array.from({ length: 51 }, () => event()) },
    { events: [event()], unexpected: true },
  ])('rejects an invalid batch shape or count', payload => {
    expect(() => validateTelemetryBatch(payload, NOW)).toThrow()
  })

  it.each([
    { event: 'page.mousemove', type: 'interaction' },
    { event: 'game.start', type: 'user' },
    { event: 'constructor', type: 'custom' },
    { eventId: 'not-a-uuid' },
    { eventId: '00000000-0000-0000-0000-000000000000' },
    { timestamp: 'tomorrow' },
    { timestamp: '2026-02-30T13:00:00.000Z' },
    { timestamp: '2026-09-10T13:05:00.001Z' },
    { userId: '' },
    { userId: 'x'.repeat(129) },
  ])('rejects invalid event identifiers, types, or timestamps: %o', overrides => {
    expect(() => validateTelemetryBatch({ events: [event(overrides)] }, NOW)).toThrow()
  })

  it('rejects duplicate UUIDs case-insensitively', () => {
    const original = event()
    expect(() => validateTelemetryBatch({
      events: [original, { ...original, eventId: original.eventId.toUpperCase() }],
    }, NOW)).toThrow('unique')
  })

  it.each([
    { value: Number.NaN }, { value: Number.POSITIVE_INFINITY }, { value: 1n },
    { value: undefined }, { value: () => 1 }, { value: new Date() },
    { value: new Map() }, { value: [undefined] },
  ])('rejects non-JSON properties without a silent empty-object fallback', properties => {
    expect(() => validateTelemetryBatch({ events: [event({ properties })] }, NOW)).toThrow()
  })

  it('rejects cycles, accessors, symbols, excessive nesting, and non-object contexts', () => {
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    const accessor = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: () => { throw new Error('Accessor must not execute') },
    })
    let nested: Record<string, unknown> = {}
    for (let i = 0; i < 12; i += 1) nested = { child: nested }
    for (const properties of [cycle, accessor, nested, { [Symbol('private')]: 'value' }]) {
      expect(() => validateTelemetryBatch({ events: [event({ properties })] }, NOW)).toThrow()
    }
    expect(() => validateTelemetryBatch({ events: [{ ...event(), context: [] }] }, NOW)).toThrow()
  })

  it('enforces event and batch sizes in UTF-8 bytes, not character counts', () => {
    expect(validateTelemetryBatch({ events: [event({ properties: { text: 'a'.repeat(4096) } })] }, NOW)).toHaveLength(1)
    expect(() => validateTelemetryBatch({
      events: [event({ properties: { text: '🔥'.repeat(4096) } })],
    }, NOW)).toThrow('UTF-8')
    expect(() => validateTelemetryBatch({
      events: Array.from({ length: 10 }, () => event({ properties: { text: 'a'.repeat(14 * 1024) } })),
    }, NOW)).toThrow('128 KiB')
  })

  it('takes a detached JSON snapshot and keeps prototype-shaped keys as data', () => {
    const properties: Record<string, unknown> = JSON.parse('{"__proto__":{"safe":true},"nested":{"score":10}}')
    const original = event({ properties })
    const [validated] = validateTelemetryBatch({ events: [original] }, NOW)
    properties.nested = { score: 20 }
    expect(validated.properties).toEqual(JSON.parse('{"__proto__":{"safe":true},"nested":{"score":10}}'))
    expect(Object.getPrototypeOf(validated.properties)).toBe(Object.prototype)
  })

  it('fails clearly without the private Eventstream connection secret', async () => {
    const ctx = new RayfinContext({
      rayfinToken: 'test-only-token',
      publishableKey: 'pk-test-only',
      rayFinEndpoint: 'https://example.invalid',
    })
    await expect(trackTelemetryBatch(ctx, { events: [event({ timestamp: new Date().toISOString() })] }))
      .rejects.toMatchObject({ code: 'CONFIGURATION_ERROR', retryable: false })
  })
})

describe('Eventstream producer acknowledgment boundary', () => {
  it('uses bounded SDK batches and acknowledges only completed sends', async () => {
    const events = [event(), event(), event()]
    const producer = new FakeProducer(1)
    const response = await forwardTelemetryEvents(events, producer, () => NOW)
    expect(response).toEqual(acknowledge(events))
    expect(producer.sent).toHaveLength(3)
    for (const [options] of producer.createBatch.mock.calls) {
      expect(options.maxSizeInBytes).toBe(TELEMETRY_LIMITS.producerBatchBytes)
      expect(options.abortSignal).toBeDefined()
    }
    const data = producer.sent[0].events[0]
    expect(data.messageId).toBe(events[0].eventId)
    expect(data.contentType).toBe('application/json')
    expect(Buffer.isBuffer(data.body)).toBe(true)
    if (!Buffer.isBuffer(data.body)) throw new Error('Expected a UTF-8 JSON body')
    expect(JSON.parse(data.body.toString('utf8'))).toEqual(telemetryEnvelope(events[0], NOW.toISOString()))
    expect(producer.close).toHaveBeenCalledTimes(1)
  })

  it('does not return an acknowledgment while the SDK send is pending', async () => {
    const producer = new FakeProducer()
    let release: () => void = () => { throw new Error('Send has not started') }
    let started: () => void = () => {}
    const sendStarted = new Promise<void>(resolve => { started = resolve })
    producer.sendBatch.mockImplementation(() => new Promise<void>(resolve => {
      release = resolve
      started()
    }))
    let completed = false
    const pending = forwardTelemetryEvents([event()], producer, () => NOW).then(result => {
      completed = true
      return result
    })
    await sendStarted
    expect(completed).toBe(false)
    expect(producer.close).not.toHaveBeenCalled()
    release()
    await pending
    expect(completed).toBe(true)
  })

  it('does not acknowledge a failed send, closes the connection, and keeps IDs for retries', async () => {
    const events = [event(), event()]
    const producer = new FakeProducer(1)
    producer.sendBatch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Test send failure'))
    await expect(forwardTelemetryEvents(events, producer, () => NOW)).rejects.toThrow('Test send failure')
    expect(producer.close).toHaveBeenCalledTimes(1)
    const retry = new FakeProducer()
    expect(await forwardTelemetryEvents(events, retry, () => NOW)).toEqual(acknowledge(events))
    expect(retry.sent[0].events.map(item => item.messageId)).toEqual(events.map(item => item.eventId))
  })

  it('rejects an event that cannot fit into an empty SDK batch without sending it', async () => {
    const producer = new FakeProducer(0)
    await expect(forwardTelemetryEvents([event()], producer)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(producer.sendBatch).not.toHaveBeenCalled()
    expect(producer.close).toHaveBeenCalledTimes(1)
  })

  it('closes after batch creation failure and propagates close failures rather than claiming success', async () => {
    const producer = new FakeProducer()
    producer.createBatch.mockRejectedValueOnce(new Error('Test create failure'))
    await expect(forwardTelemetryEvents([event()], producer)).rejects.toThrow('Test create failure')
    expect(producer.close).toHaveBeenCalledTimes(1)
    const closeFailure = new FakeProducer()
    closeFailure.close.mockRejectedValueOnce(new Error('Test close failure'))
    await expect(forwardTelemetryEvents([event()], closeFailure)).rejects.toThrow('Test close failure')
  })

  it.each(['createBatch', 'sendBatch', 'close'] as const)(
    'returns a sanitized retryable function envelope for an expected SDK %s failure',
    async method => {
      const producer = new FakeProducer()
      const failure = new MessagingError('Private endpoint or credentials must not reach the response')
      producer[method].mockRejectedValueOnce(failure)
      const response = await functionResult('{}', () => forwardTelemetryEvents([event()], producer))
      expect(JSON.parse(response)).toEqual({
        success: false,
        code: 'TELEMETRY_UNAVAILABLE',
        errorMessage: 'Telemetry forwarding failed.',
        retryable: true,
      })
      expect(response).not.toContain('Private')
      expect(response).not.toContain('acknowledgedEventIds')
      expect(producer.close).toHaveBeenCalledTimes(1)
    },
  )

  it('preserves the SDK nonretryable classification without leaking its error details', async () => {
    const producer = new FakeProducer()
    const failure = new MessagingError('Private authentication failure details')
    failure.retryable = false
    producer.sendBatch.mockRejectedValueOnce(failure)
    await expect(forwardTelemetryEvents([event()], producer)).rejects.toMatchObject({
      code: 'TELEMETRY_UNAVAILABLE', message: 'Telemetry forwarding failed.', retryable: false,
    })
    expect(producer.close).toHaveBeenCalledTimes(1)
  })

  it('classifies timeouts and aggregates containing only known SDK failures', async () => {
    const abort = new Error('Private timeout details')
    abort.name = 'AbortError'
    for (const failure of [abort, new AggregateError([new MessagingError('Private transport details'), abort])]) {
      const producer = new FakeProducer()
      producer.sendBatch.mockRejectedValueOnce(failure)
      await expect(forwardTelemetryEvents([event()], producer)).rejects.toMatchObject({
        code: 'TELEMETRY_UNAVAILABLE', message: 'Telemetry forwarding failed.', retryable: true,
      })
      expect(producer.close).toHaveBeenCalledTimes(1)
    }
  })

  it('leaves coding errors and mixed aggregates for the shared wrapper to handle', async () => {
    const codingError = new TypeError('Test coding failure')
    for (const failure of [codingError, new AggregateError([new MessagingError('Transport failure'), codingError])]) {
      const producer = new FakeProducer()
      producer.sendBatch.mockRejectedValueOnce(failure)
      await expect(forwardTelemetryEvents([event()], producer)).rejects.toBe(failure)
      expect(producer.close).toHaveBeenCalledTimes(1)
    }
  })
})

const invokeOperation = jest.fn(async (_name: string, input: { events: TelemetryEvent[] }) => acknowledge(input.events))
jest.unstable_mockModule('../../../src/services/rayfinClient', () => ({ invokeOperation }))
jest.unstable_mockModule('../../../src/config/gameConfig', () => ({
  gameConfig: {
    telemetry: { enabled: true, logToConsole: false, batchSize: 50, flushInterval: 5000 },
    keyboard: { mappings: { A: 0, K: 1, S: 2, L: 3 } },
  },
}))
const { AnalyticsService } = await import('../../../src/services/analyticsService')

describe('browser telemetry delivery', () => {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://trivia.example/playing?code=private-code#private-token',
  })
  const sender = jest.fn(async (events: TelemetryEvent[]) => acknowledge(events))
  let service: InstanceType<typeof AnalyticsService>
  let warn: ReturnType<typeof jest.spyOn>

  beforeAll(() => {
    Object.defineProperties(globalThis, {
      window: { configurable: true, value: dom.window },
      document: { configurable: true, value: dom.window.document },
      HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    })
    Object.defineProperty(dom.window.crypto, 'randomUUID', { value: randomUUID })
  })

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
    sender.mockReset().mockImplementation(async events => acknowledge(events))
    invokeOperation.mockClear()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    document.body.innerHTML = ''
    document.cookie = 'stationId=station-one'
    service = new AnalyticsService(sender)
  })

  afterEach(async () => {
    service.dispose()
    await Promise.resolve()
    warn.mockRestore()
    jest.useRealTimers()
  })

  afterAll(() => {
    dom.window.close()
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'document')
    Reflect.deleteProperty(globalThis, 'HTMLElement')
  })

  it('routes every existing event name through the decoded typed Rayfin operation', async () => {
    service = new AnalyticsService()
    for (const [name] of EVENT_TYPES) service.track(name)
    await service.flush()
    const [name, input] = invokeOperation.mock.calls[0]
    expect(name).toBe('trackTelemetryBatch')
    expect(input.events.map(item => [item.event, item.type])).toEqual(EVENT_TYPES)
    expect(new Set(input.events.map(item => item.eventId)).size).toBe(11)
    expect(service.getTrackedEventCount()).toBe(11)
    expect(service.getDeliveryStatus()).toMatchObject({ deliveredCount: 11, queuedCount: 0 })
  })

  it('snapshots attendee, session, pool, station, payload and event ID before retries', async () => {
    const participant: User = {
      userId: 'participant-one', name: 'Amber Query Crafter',
      country: 'Canada',
      createdAt: NOW.toISOString(),
    }
    service.identify(participant)
    service.setSession('session-one')
    service.setPool({ id: 'fabric', name: 'Fabric' })
    const properties = { nested: { score: 10 }, optional: undefined }
    const context = { nested: { page: 'playing' } }
    service.track('game.start', properties, context)
    sender.mockRejectedValueOnce(new Error('Private upstream error must not be logged'))
    await service.flush()
    const original = structuredClone(sender.mock.calls[0][0][0])
    properties.nested.score = 20
    context.nested.page = 'results'
    service.identify({ ...participant, userId: 'participant-two', country: 'Kenya' })
    service.setSession('session-two')
    service.setPool({ id: 'other', name: 'Other' })
    document.cookie = 'stationId=station-two'
    service.track('game.ended')
    await jest.advanceTimersByTimeAsync(1000)
    expect(sender.mock.calls[1][0][0]).toEqual(original)
    expect(original).toMatchObject({
      userId: 'participant-one', properties: { nested: { score: 10 } },
      context: { country: 'Canada', sessionId: 'session-one', poolId: 'fabric', poolName: 'Fabric', stationId: 'station-one' },
    })
    expect(original.properties).not.toHaveProperty('optional')
    expect(sender.mock.calls[1][0][1]).toMatchObject({
      userId: 'participant-two', context: { country: 'Kenya', sessionId: 'session-two', poolId: 'other', stationId: 'station-two' },
    })
    expect(original.context?.url).toBe('https://trivia.example/playing')
    for (const field of ['userAgent', 'viewport', 'screen', 'language']) {
      expect(original.context).not.toHaveProperty(field)
    }
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/participant|Private upstream|private-code|private-token/)
    service.identify(null)
    service.track('pageview.home')
    await service.flush()
    const nextAttendee = sender.mock.calls.at(-1)?.[0][0]
    expect(nextAttendee).not.toHaveProperty('userId')
    expect(nextAttendee?.context).not.toHaveProperty('country')
  })

  it('queues ASCII countries for saved legacy players without changing their profile', async () => {
    const participant: User = {
      userId: 'participant-one', name: 'Amber Query Crafter',
      country: 'Côte d’Ivoire', createdAt: NOW.toISOString(),
    }
    service.identify(participant)
    service.track('user.register', { country: participant.country, nested: [{ Country: 'Curaçao' }] })
    service.track('game.start')
    await service.flush()
    expect(sender.mock.calls[0][0]).toMatchObject([
      { properties: { country: "Cote d'Ivoire", nested: [{ Country: 'Curacao' }] }, context: { country: "Cote d'Ivoire" } },
      { context: { country: "Cote d'Ivoire" } },
    ])
    expect(service.getDeliveryStatus()).toMatchObject({ deliveredCount: 2, droppedCount: 0 })
    expect(participant.country).toBe('Côte d’Ivoire')
  })

  it('never queues contact details, passwords, or arbitrary registration names', async () => {
    for (const properties of [
      { email: 'person@example.invalid' }, { password: 'otter-42' },
      { nested: { passwordHash: 'private' } }, { secretCode: 'ABCDE' },
      { nested: { secretCodeHash: 'private' } }, { name: 'Real Person' },
      { country: 'Canada, Ontario' }, { nested: { city: 'Toronto' } },
    ]) service.track('user.register', properties)
    service.track('user.register', { name: 'Amber Query Crafter', country: 'Canada', entryMode: 'returning' })
    await service.flush()
    expect(service.getDeliveryStatus()).toMatchObject({ droppedCount: 8, deliveredCount: 1 })
    expect(sender.mock.calls[0][0][0].properties).toEqual({ name: 'Amber Query Crafter', country: 'Canada', entryMode: 'returning' })
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/person@example|otter-42|Real Person/)
  })

  it('does not capture clicks, touches, or keystrokes inside a private entry region, including SVG targets', async () => {
    service.initialize()
    document.body.innerHTML = '<section data-telemetry-private><button id="entry"><svg><path /></svg>Enter</button><input id="secret-code" type="password" value="ABCDE" /></section>'
    const button = document.getElementById('entry')
    const input = document.getElementById('secret-code')
    const svg = document.querySelector('svg')
    if (!button || !input || !svg) throw new Error('Private fixture missing')
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    svg.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'A', bubbles: true }))
    const touch = new dom.window.Event('touchstart', { bubbles: true })
    Object.defineProperty(touch, 'touches', { value: [{ clientX: 10, clientY: 10 }] })
    svg.dispatchEvent(touch)
    await service.flush()
    expect(sender).not.toHaveBeenCalled()
    expect(service.getTrackedEventCount()).toBe(0)
  })

  it('returns the active flush promise and never runs concurrent sends', async () => {
    let release: (response: TelemetryBatchResponse) => void = () => { throw new Error('No pending request') }
    sender.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    service.track('game.start')
    const first = service.flush()
    const second = service.flush()
    expect(first).toBe(second)
    expect(sender).toHaveBeenCalledTimes(1)
    expect(service.getDeliveryStatus().sending).toBe(true)
    release(acknowledge(sender.mock.calls[0][0]))
    await first
    expect(service.getDeliveryStatus()).toMatchObject({ sending: false, deliveredCount: 1 })
  })

  it('does not treat disabled forwarding or unknown acknowledgment IDs as delivery', async () => {
    service.track('game.start')
    sender.mockImplementationOnce(async events => ({ ...acknowledge(events), forwarded: false }))
    await service.flush()
    expect(service.getDeliveryStatus()).toMatchObject({ queuedCount: 1, deliveredCount: 0, lastFailure: 'not-forwarded' })
    sender.mockResolvedValueOnce({ ...acknowledge([]), acknowledgedEventIds: [randomUUID()] })
    await jest.advanceTimersByTimeAsync(1000)
    expect(service.getDeliveryStatus()).toMatchObject({
      queuedCount: 1, deliveredCount: 0, lastFailure: 'invalid-acknowledgment',
    })
  })

  it('keeps unacknowledged events after partial acknowledgment', async () => {
    service.track('game.start')
    service.track('game.ended')
    sender.mockImplementationOnce(async events => acknowledge(events.slice(0, 1)))
    await service.flush()
    const pendingId = sender.mock.calls[0][0][1].eventId
    expect(service.getDeliveryStatus()).toMatchObject({ deliveredCount: 1, queuedCount: 1 })
    await jest.advanceTimersByTimeAsync(1000)
    expect(sender.mock.calls[1][0].map(item => item.eventId)).toEqual([pendingId])
    expect(service.getDeliveryStatus()).toMatchObject({ deliveredCount: 2, queuedCount: 0 })
  })

  it('backs off exponentially, honors the delay on explicit flushes, and bounds attempts', async () => {
    sender.mockRejectedValue(new Error('Test outage'))
    service.track('game.start')
    await service.flush()
    for (const delay of [1000, 2000, 4000, 8000, 16_000, 30_000, 30_000]) {
      const calls = sender.mock.calls.length
      await service.flush()
      await jest.advanceTimersByTimeAsync(delay - 1)
      expect(sender).toHaveBeenCalledTimes(calls)
      await jest.advanceTimersByTimeAsync(1)
      expect(sender).toHaveBeenCalledTimes(calls + 1)
    }
    expect(service.getDeliveryStatus()).toMatchObject({
      queuedCount: 0, droppedCount: 1, deliveredCount: 0, retryAt: null, lastFailure: 'retry-limit',
    })
    await jest.advanceTimersByTimeAsync(60_000)
    expect(sender).toHaveBeenCalledTimes(8)
  })

  it('bounds the in-memory queue including in-flight events and drops excess events explicitly', async () => {
    let release: (response: TelemetryBatchResponse) => void = () => { throw new Error('No pending request') }
    sender.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    for (let i = 0; i < 501; i += 1) service.track('page.click', { x: i })
    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender.mock.calls[0][0]).toHaveLength(50)
    expect(service.getDeliveryStatus()).toMatchObject({ queuedCount: 500, droppedCount: 1, lastFailure: 'queue-full' })
    release(acknowledge(sender.mock.calls[0][0]))
    await service.flush()
  })

  it('bounds network batches by UTF-8 size and schedules continued flushing', async () => {
    for (let i = 0; i < 10; i += 1) service.track('game.answerquestion', { text: 'a'.repeat(14 * 1024) })
    await service.flush()
    expect(sender.mock.calls[0][0].length).toBeLessThan(10)
    expect(Buffer.byteLength(JSON.stringify({ events: sender.mock.calls[0][0] }))).toBeLessThanOrEqual(96 * 1024)
    await jest.advanceTimersByTimeAsync(50)
    expect(service.getDeliveryStatus()).toMatchObject({ deliveredCount: 10, queuedCount: 0 })
  })

  it('caps queued UTF-8 bytes independently of the event count limit', async () => {
    let release: (response: TelemetryBatchResponse) => void = () => { throw new Error('No pending request') }
    sender.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    for (let i = 0; i < 160; i += 1) service.track('game.answerquestion', { text: 'a'.repeat(14 * 1024) })
    expect(service.getDeliveryStatus().queuedCount).toBeLessThan(160)
    expect(service.getDeliveryStatus().droppedCount).toBeGreaterThan(0)
    expect(service.getDeliveryStatus().lastFailure).toBe('queue-full')
    release(acknowledge(sender.mock.calls[0][0]))
    await service.flush()
  })

  it('drops invalid or oversized payloads with safe diagnostics instead of sending empty objects', async () => {
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    for (const properties of [cycle, { value: 1n }, { value: Number.NaN }, { value: () => 1 }]) {
      expect(() => service.track('game.start', properties)).not.toThrow()
    }
    service.track('game.start', { value: '🔥'.repeat(4096) })
    await service.flush()
    expect(sender).not.toHaveBeenCalled()
    expect(service.getDeliveryStatus()).toMatchObject({ queuedCount: 0, droppedCount: 5, lastFailure: 'event-too-large' })
  })

  it('expires old queued events without sending them', async () => {
    service.track('game.start')
    jest.setSystemTime(NOW.getTime() + 10 * 60 * 1000)
    await service.flush()
    expect(sender).not.toHaveBeenCalled()
    expect(service.getDeliveryStatus()).toMatchObject({ droppedCount: 1, queuedCount: 0, lastFailure: 'expired' })
  })

  it('preserves click/touch/key handlers and privacy exclusions without collecting mouse movement', async () => {
    service.initialize()
    document.body.innerHTML = '<button id="answer">Answer</button><input id="name"><div contenteditable="true"><span id="editor">Typed text</span></div>'
    const button = document.getElementById('answer')
    const input = document.getElementById('name')
    const editor = document.getElementById('editor')
    if (!button || !input || !editor) throw new Error('Test DOM missing')
    await jest.advanceTimersByTimeAsync(20)
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }))
    await jest.advanceTimersByTimeAsync(20)
    const touch = new dom.window.Event('touchstart', { bubbles: true })
    Object.defineProperties(touch, {
      touches: { value: [{ clientX: 30, clientY: 40 }] }, changedTouches: { value: [] },
    })
    button.dispatchEvent(touch)
    button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'a', code: 'KeyA' }))
    button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'q', code: 'KeyQ' }))
    button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'a', code: 'KeyA', repeat: true }))
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'q', code: 'KeyQ' }))
    editor.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'q', code: 'KeyQ' }))
    button.dispatchEvent(new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 60 }))
    await service.flush()
    expect(sender.mock.calls[0][0].map(item => item.event)).toEqual([
      'page.click', 'page.touch', 'page.keyboardkeydown', 'page.keyboardkeydown',
    ])
    expect(sender.mock.calls[0][0][0].properties).toMatchObject({ x: 10, y: 20, element: 'button#answer' })
    expect(sender.mock.calls[0][0][1].properties).toMatchObject({ x: 30, y: 40 })
    expect(sender.mock.calls[0][0][2].properties).toMatchObject({ key: 'a', code: 'KeyA' })
    expect(sender.mock.calls[0][0][3].properties).toMatchObject({ key: 'alpha', code: 'alpha' })
  })

  it('flushes on hidden visibility and unload and removes handlers on disposal', async () => {
    service.initialize()
    service.track('game.start')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new dom.window.Event('visibilitychange'))
    await service.flush()
    expect(service.getDeliveryStatus().deliveredCount).toBe(1)
    service.track('game.ended')
    window.dispatchEvent(new dom.window.Event('beforeunload'))
    await service.flush()
    expect(service.getDeliveryStatus().deliveredCount).toBe(2)
    service.dispose()
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }))
    await jest.advanceTimersByTimeAsync(10_000)
    expect(sender).toHaveBeenCalledTimes(2)
    expect(service.getDeliveryStatus().enabled).toBe(false)
  })

  it('settles an in-flight send on disposal without retrying or counting it as both delivered and dropped', async () => {
    let release: (response: TelemetryBatchResponse) => void = () => { throw new Error('No pending request') }
    sender.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    service.track('game.start')
    const pending = service.flush()
    service.track('game.ended')
    service.dispose()
    release(acknowledge(sender.mock.calls[0][0]))
    await pending
    expect(service.getDeliveryStatus()).toMatchObject({
      enabled: false, queuedCount: 0, sending: false, deliveredCount: 1, droppedCount: 1, retryAt: null,
    })
    await jest.advanceTimersByTimeAsync(60_000)
    expect(sender).toHaveBeenCalledTimes(1)
  })

  it('exposes safe delivery observations without allowing observer exceptions to block gameplay', async () => {
    const observer = jest.fn(() => { throw new Error('Observer test failure') })
    const unsubscribe = service.subscribeDeliveryStatus(observer)
    expect(() => service.track('game.start')).not.toThrow()
    await service.flush()
    expect(observer).toHaveBeenCalled()
    expect(service.getDeliveryStatus().deliveredCount).toBe(1)
    unsubscribe()
    observer.mockClear()
    service.resetTrackedEventCount()
    service.track('game.ended')
    expect(service.getTrackedEventCount()).toBe(1)
    expect(observer).not.toHaveBeenCalled()
  })
})
