import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Camera, MapPin } from 'lucide-react'
import EntryCountryPicker from '../components/EntryCountryPicker'
import StationAvatar from '../components/StationAvatar'
import { useGame } from '../context/GameContext'
import { userService } from '../services/userService'
import { OperationError } from '../services/operationError'
import { analytics } from '../services/analyticsService'
import { isCountry } from '../../rayfin/functions/src/countries'
import { getStationLockdownMessage, isStationLockdownActive } from '../lib/stationLockdown'
import {
  isPlayerCode,
  normalizePlayerCode,
  PLAYER_CODE_ALPHABET,
  PLAYER_CODE_LENGTH,
} from '../../rayfin/functions/src/playerIdentity'
import type { RegisteredPlayer, RegisterUserRequest, User } from '../types/api'
import './SignInPage.css'

type InvalidField = 'code' | null

const CODE_RULE = 'Enter your 5-character secret code.'

// Each slot shows one character, so drop anything a code can never contain.
const toCodeCharacters = (value: string) =>
  [...normalizePlayerCode(value)]
    .filter(char => PLAYER_CODE_ALPHABET.includes(char))
    .join('')
    .slice(0, PLAYER_CODE_LENGTH)

function withoutSecretCode(player: RegisteredPlayer): User {
  const user = { ...player }
  delete user.secretCode
  return user
}

export default function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setPlayer, generation, isCurrentGame } = useGame()
  const mountedRef = useRef(false)
  const submittingRef = useRef(false)
  const nameHeading = useRef<HTMLHeadingElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'new' | 'returning'>('new')
  const [country, setCountry] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [pendingCreation, setPendingCreation] = useState<RegisterUserRequest | null>(null)
  const [registered, setRegistered] = useState<User | null>(null)
  const [issuedCode, setIssuedCode] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<InvalidField>(null)
  const isLockdownActive = isStationLockdownActive()
  const displayedError = isLockdownActive ? getStationLockdownMessage() : error
  const creationFrozen = pendingCreation !== null
  const issued = registered !== null
  const controlsDisabled = isSubmitting || creationFrozen || issued || isLockdownActive
  const detailsReady = mode === 'new' ? isCountry(country) : secretCode.length > 0
  const canSubmit = !isSubmitting && !isLockdownActive && (creationFrozen || detailsReady)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  useEffect(() => {
    analytics.track('pageview.home', { path: location.pathname })
  }, [location.pathname])
  useEffect(() => {
    if (issued) nameHeading.current?.focus({ preventScroll: true })
  }, [issued])
  useEffect(() => {
    if (isSubmitting || invalidField !== 'code') return
    codeInput.current?.focus({ preventScroll: true })
  }, [invalidField, isSubmitting])

  const startEntry = (nextMode: 'new' | 'returning') => {
    if (submittingRef.current || registered) return
    setMode(nextMode)
    setCountry('')
    setSecretCode('')
    setPendingCreation(null)
    setError(null)
    setInvalidField(null)
  }
  const reject = (field: InvalidField, message: string) => {
    setInvalidField(field)
    setError(message)
  }
  const enterChallenge = (user: User) => {
    if (isStationLockdownActive()) {
      setError(getStationLockdownMessage())
      return
    }
    analytics.identify(user)
    analytics.track(
      'user.register',
      { userId: user.userId, name: user.name, country: user.country, entryMode: mode },
      { page: 'signin' }
    )
    setPlayer(user)
    navigate('/select-pool')
  }
  const submitEntry = async () => {
    if (submittingRef.current || registered) return
    if (isStationLockdownActive()) {
      setError(getStationLockdownMessage())
      return
    }
    let request: RegisterUserRequest
    if (mode === 'new') {
      if (pendingCreation) request = pendingCreation
      else {
        if (!isCountry(country)) return reject(null, 'Choose a country or region from the list.')
        request = { mode: 'new', requestId: crypto.randomUUID(), country }
        setPendingCreation(request)
      }
    } else {
      const normalizedCode = normalizePlayerCode(secretCode)
      if (!isPlayerCode(normalizedCode)) return reject('code', CODE_RULE)
      request = { mode: 'returning', secretCode: normalizedCode }
    }
    setError(null)
    setInvalidField(null)
    setIsSubmitting(true)
    submittingRef.current = true
    try {
      const player = await userService.register(request)
      if (!mountedRef.current || !isCurrentGame(generation)) return
      const user = withoutSecretCode(player)
      if (mode === 'new') {
        if (!player.secretCode) {
          setPendingCreation(null)
          setCountry('')
          throw new Error('Secret code was not returned. Start a new challenge.')
        }
        setRegistered(user)
        setIssuedCode(player.secretCode)
        setPendingCreation(null)
      } else {
        setSecretCode('')
        enterChallenge(user)
      }
    } catch (failure) {
      if (!mountedRef.current || !isCurrentGame(generation)) return
      const operationError = failure instanceof OperationError ? failure : null
      const wrongCode =
        mode === 'returning' && operationError?.code === 'PLAYER_VERIFICATION_FAILED'
      if (mode === 'new' && operationError?.code === 'PLAYER_ALREADY_CREATED') {
        setPendingCreation(null)
        setCountry('')
      }
      setError(
        wrongCode
          ? "That secret code didn't match an adventurer. Check your photo and try again, or start a new challenge."
          : failure instanceof Error
            ? failure.message
            : 'Player entry failed. Please try again.'
      )
      if (wrongCode) {
        setSecretCode('')
        setInvalidField('code')
      }
    } finally {
      submittingRef.current = false
      if (mountedRef.current && isCurrentGame(generation)) setIsSubmitting(false)
    }
  }
  const describedBy = (field: InvalidField, ...ids: string[]) =>
    [...ids, invalidField === field && displayedError ? 'entry-feedback' : '']
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className="player-entry" data-telemetry-private>
      <div className="entry-board">
        <header className="entry-brand">
          <img src="/fabriclogo.png" alt="Microsoft Fabric" />
          <p>
            The Microsoft Fabric <strong>Trivia Challenge</strong>
          </p>
        </header>
        <main className="entry-main">
          <form
            className="entry-split"
            aria-label="Adventurer entry"
            autoComplete="off"
            aria-busy={isSubmitting}
            noValidate
            onSubmit={event => {
              event.preventDefault()
              if (canSubmit) void submitEntry()
            }}
          >
            <div className="entry-welcome" data-issued={issued}>
              <div className="entry-player-banner">
                <div className="entry-player-crest" aria-hidden="true">
                  <StationAvatar placement="entry" />
                </div>
                <div>
                  <span className="entry-eyebrow">
                    {issued
                      ? 'YOUR ADVENTURER'
                      : mode === 'returning'
                        ? 'RETURNING ADVENTURER'
                        : 'NEW ADVENTURER'}
                  </span>
                  <h1>
                    {issued ? "You're in," : mode === 'returning' ? 'Welcome' : 'Start a new'}
                    <em>{issued ? 'adventurer' : mode === 'returning' ? 'back' : 'challenge'}</em>
                  </h1>
                </div>
              </div>
              <div className="entry-player-footer">
                {issued ? (
                  <p className="entry-saved-country">
                    <MapPin size={16} /> {registered.country}
                  </p>
                ) : (
                  <div className="entry-links">
                    <button
                      type="button"
                      className="entry-mode-link"
                      disabled={controlsDisabled}
                      onClick={() => startEntry(mode === 'new' ? 'returning' : 'new')}
                    >
                      {mode === 'new'
                        ? 'Have your secret code? Enter it here'
                        : 'Forgot your code? Start a new challenge'}
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                    {creationFrozen && !isSubmitting && (
                      <button
                        type="button"
                        className="entry-mode-link"
                        onClick={() => startEntry('new')}
                      >
                        Start a new challenge
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              className="entry-lock"
              data-ticket={issued || mode === 'returning'}
              data-entry-error={displayedError || undefined}
            >
              {issued ? (
                <section className="entry-ticket-stage" aria-label="Your adventurer is ready">
                  <article className="entry-ticket">
                    <header className="entry-ticket-stub">
                      <h2
                        ref={nameHeading}
                        tabIndex={-1}
                        className="entry-ticket-kicker"
                        aria-describedby="entry-issued-value"
                      >
                        Adventurer
                      </h2>
                      <output
                        id="entry-issued-value"
                        className="entry-ticket-name"
                        aria-label="Adventurer name"
                      >
                        {registered.name}
                      </output>
                    </header>
                    <div className="entry-ticket-perf" aria-hidden="true" />
                    <div className="entry-ticket-body">
                      <span className="entry-ticket-kicker">Secret code</span>
                      <output
                        id="entry-issued-code"
                        className="entry-code-tiles"
                        aria-label="Secret code"
                      >
                        {issuedCode?.split('').map((char, index) => (
                          <span key={index}>{char}</span>
                        ))}
                      </output>
                      <span className="entry-ticket-foot" aria-hidden="true">
                        Microsoft Fabric Trivia Challenge
                      </span>
                    </div>
                  </article>
                  <p className="entry-ticket-note" role="note">
                    <Camera size={24} aria-hidden="true" />
                    <span>
                      <b>Take a photo of your ticket.</b> Your code won't be shown again, and it's
                      all you need to come back.
                    </span>
                  </p>
                </section>
              ) : mode === 'returning' ? (
                <div className="entry-ticket-stage">
                  <article className="entry-ticket" data-invalid={invalidField === 'code'}>
                    <div className="entry-ticket-stub" aria-hidden="true">
                      <span className="entry-ticket-kicker">Adventurer</span>
                      <span className="entry-ticket-blank" />
                    </div>
                    <div className="entry-ticket-perf" aria-hidden="true" />
                    <div className="entry-ticket-body">
                      <span className="entry-ticket-kicker" aria-hidden="true">
                        Secret code
                      </span>
                      <div className="entry-code-slots" data-checking={isSubmitting}>
                        {Array.from({ length: PLAYER_CODE_LENGTH }, (_, index) => (
                          <span
                            key={index}
                            aria-hidden="true"
                            data-filled={index < secretCode.length}
                            data-next={index === secretCode.length}
                          >
                            {index < secretCode.length ? '*' : null}
                          </span>
                        ))}
                        {/* A plain text field under the slots, so browsers never offer to save
                            the code as a password. Shared kiosk: autocomplete stays off. */}
                        <input
                          ref={codeInput}
                          className="entry-code-input"
                          type="text"
                          aria-label="Secret code"
                          aria-invalid={invalidField === 'code'}
                          aria-describedby={describedBy('code', 'entry-code-hint')}
                          value={secretCode}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          maxLength={12}
                          disabled={controlsDisabled}
                          onChange={event => {
                            setSecretCode(toCodeCharacters(event.target.value))
                            setError(null)
                            setInvalidField(null)
                          }}
                        />
                      </div>
                      <span className="entry-ticket-foot" aria-hidden="true">
                        Microsoft Fabric Trivia Challenge
                      </span>
                    </div>
                  </article>
                  <p className="entry-ticket-note" id="entry-code-hint">
                    <Camera size={24} aria-hidden="true" />
                    <b>Type the code from your ticket photo.</b>
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="entry-secret-heading">
                    Choose your country or region. We'll give you an adventurer name and a secret
                    code.
                  </h2>
                  <div className="entry-secret">
                    <EntryCountryPicker
                      value={country}
                      disabled={controlsDisabled}
                      onChange={value => {
                        setCountry(value)
                        setError(null)
                      }}
                    />
                  </div>
                </>
              )}
              <div className="entry-final-action">
                {displayedError ? (
                  <p className="entry-feedback" role="alert" id="entry-feedback">
                    {displayedError}
                  </p>
                ) : !issued && isSubmitting ? (
                  <p className="entry-feedback" role="status">
                    {mode === 'new'
                      ? 'Creating your adventurer...'
                      : 'Checking your secret code...'}
                  </p>
                ) : null}
                {issued ? (
                  <button
                    type="button"
                    className="play-go entry-create"
                    disabled={isLockdownActive}
                    onClick={() => enterChallenge(registered)}
                  >
                    Begin trivia <ArrowRight size={18} />
                  </button>
                ) : (
                  <button type="submit" className="play-go entry-create" disabled={!canSubmit}>
                    {mode === 'returning'
                      ? 'Continue'
                      : creationFrozen && error
                        ? 'Retry'
                        : 'Start a new challenge'}
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
      <footer className="privacy-notice entry-privacy" aria-label="Privacy notice">
        <div className="entry-privacy-copy">
          <p>
            Your privacy matters to us. We save your selected country or region with your adventurer
            profile. When you start the Challenge, your country, gameplay and telemetry data feed
            the Microsoft Fabric Real-Time Intelligence demo so attendees can see live analytics.
            That telemetry may inform post-event learnings or future Microsoft marketing.
          </p>
          <p>
            Scan the QR code to read the Terms and Conditions before you begin your challenge run.
          </p>
        </div>
        <figure className="entry-terms-qr">
          <span className="entry-terms-qr-tile">
            <img src="/terms-qr.png" alt="QR code for the Terms and Conditions" />
          </span>
          <figcaption>Scan to read the Terms and Conditions</figcaption>
        </figure>
      </footer>
    </div>
  )
}
