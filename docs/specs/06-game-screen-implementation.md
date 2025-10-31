# 06: Game Screen Implementation

Implement the full gameplay experience on `PlayingPage`, wiring real session data, answer handling, timer bonuses, and streak visuals into the existing components.

## Functional Requirements
- Start a fresh session for the signed-in player when entering the playing route; if no player exists or an error occurs, redirect back to registration.
- Fetch the randomized question draw for the new session once and iterate through it sequentially without creating additional sessions or refetching between questions.
- Render each question number, prompt, and the four configured answers via `QuestionContainer` and `AnswerGrid`, matching the existing visual design.
- Accept answer selections from touch, mouse, and configured keyboard shortcuts, disabling input while a submission is in flight to prevent duplicates.
- Submit every answer to the backend; on a correct answer, advance immediately while updating streak, score, and totals; on a wrong answer, decrement streak progress, pause the timer for the configured duration, surface a clear wrong-answer state, then continue with the next question after the pause.
- Keep `GameContext` (or equivalent helper) up to date with streak counts, score, questions answered, correct answers, current question index, and timer values so downstream screens can present accurate stats.
- Grant timer bonuses when streak thresholds are hit, reflect updated values in `TimerBar`, and trigger the existing bonus notification animation.
- End the session by calling the backend end-session endpoint with summary metrics (questions answered, correct answers, streaks completed, final time remaining) when time expires or questions are exhausted before navigating to `/results`.

## Technical Requirements
- Align frontend types and `sessionService` to the v1.0 session endpoints: start session, fetch questions, submit answers, and end session, using the current backend request/response shapes.
- Persist the active session, loaded questions, and current index in `GameContext` (or a lightweight game engine helper) for the life of the playthrough; do not support session resumption after navigating away.
- Leverage `useGameTimer` for countdown, low-time warnings, bonus application, pausing for wrong answers, and syncing remaining/max time with context state.
- Implement keyboard bindings driven by `gameConfig.keyboard.mappings`, including focus indication and debouncing to avoid multiple submissions per key press.
- Handle loading and error states gracefully (e.g., show a spinner on initial load, retry or route back to instructions on fatal errors) with accessible messaging.
- Preserve accessibility: ensure answer buttons remain reachable via keyboard, provide ARIA labels for timer/streak indicators, and announce wrong-answer pauses for assistive technologies.
- Cover critical streak and timer behaviors with Jest + React Testing Library tests (e.g., streak decrement on wrong answers, bonus award timing, timer pause/resume flow).

## Subtasks
- [x] Update TypeScript API definitions and `sessionService` to match the `/api/v1.0/sessions` contracts.
- [x] Extend `GameContext` (or introduce a helper) to store session metadata, question list, and current index throughout gameplay.
- [x] Refactor `PlayingPage` to initialize a session, load questions, and render real data with appropriate loading and error handling.
- [x] Implement the answer submission pipeline (touch/mouse/keyboard) with streak updates, timer pauses, and score synchronization.
- [x] Wire `useGameTimer` events to bonus notifications, wrong-answer pauses, and automatic navigation when time expires.
- [x] Invoke the session end endpoint with final metrics before routing to `/results`.
- [ ] Add unit tests covering streak decrement logic, bonus award thresholds, and timer pause/resume behavior.

## Implementation Details
- Updated `types/api.ts`, `gameConfig.ts`, and `sessionService.ts` to align with the backend v1.0 session endpoints and data shapes.
- Expanded `GameContext` to hold the session question list and active index, resetting them alongside timer and scoring state.
- Rebuilt `PlayingPage` to start sessions, fetch question draws, manage loading/error states, and coordinate question navigation with keyboard input support.
- Integrated answer submission with backend scoring, streak tracking, timer pauses, and real-time bonus notifications, ending sessions via the new summary payload.

## Notes

- Per latest direction, automated tests for this task remain pending and are intentionally deferred.

## Feedback
