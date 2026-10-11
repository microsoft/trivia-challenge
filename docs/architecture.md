# Architecture

Microsoft Fabric Trivia Challenge is a React single-page application with a Rayfin Functions backend. Fabric SQL stores players, questions, and game results. Eventstream sends telemetry to Eventhouse for analysis.

## Components

| Component | Responsibility | Source |
| --- | --- | --- |
| React frontend | Registration, pool selection, instructions, gameplay, and results | `src/` |
| Rayfin client | Fabric operator sign-in and typed Function calls | `src/services/rayfinClient.ts` |
| Rayfin Functions | Validation, imports, scoring, persistence, and telemetry publishing | `rayfin/functions/src/` |
| Fabric SQL | Application records and transactional writes | `rayfin/data/` |
| Eventstream and Eventhouse | Telemetry ingestion and analytical queries | `scripts/provision-telemetry.mjs`, `infra/` |

## Game rules

The player flow is registration, pool selection, instructions, gameplay, and results. When only one active pool is available, selection is automatic.

| Rule | Behavior |
| --- | --- |
| Start | Three-second countdown followed by 60 seconds of active game time |
| Answers | Four choices, using touch, mouse, or A/K/S/L |
| Score | 10 points per correct answer |
| Streak progress | A correct answer adds one; an incorrect answer subtracts one, down to zero |
| Streak bonus | Five progress points award 10 seconds and reset progress; at most five bonuses |
| Active-time budget | Up to 110 seconds with the default settings; the timer also has a 120-second safety limit |
| Hearts | Five at the start; each incorrect answer removes half a heart |
| Incorrect-answer penalty | 0.25 seconds deducted from the timer |
| Answer review | The timer pauses for up to five seconds after an incorrect answer; Space skips the review |
| Correct-answer feedback | A 500 ms halo before advancing |
| End conditions | Time runs out, hearts reach zero, or all questions in the draw are answered |

Gameplay defaults and pure answer calculations are defined in `rayfin/functions/src/gameRules.ts`. The frontend's `src/config/gameConfig.ts` imports those defaults and adds telemetry and station settings. Change gameplay values in the shared module so browser calculations, server scoring, and completion validation stay aligned.

The browser owns the timer, hearts, streak progress, and immediate feedback. The backend calculates correctness and score from the saved question and submitted answer. Both use the same pure answer calculation; React scheduling, animation, and persistence remain outside that calculation.

Question draws include the correct answer index so the browser can provide feedback. The application is intended for supervised kiosks, not adversarial or prize-bearing competitions that require hidden answers and server-controlled timing.

## Authentication and data access

### Operator access

The Fabric operator signs in through the browser, but Function authorization relies on the Fabric gateway. The Function handlers do not independently check the operator, and the installed Functions SDK registers anonymous host routes for the gateway to protect. Do not expose the Functions host as a standalone anonymous service. Verify rejection of unauthenticated and unauthorized invocations in the deployed environment.

Attendee entry creates or retrieves a pseudonymous player record; it does not create a Fabric identity.

The same operator session authorizes gameplay and question loading. There is no separate question-administrator role. `/operator` separates staff controls from attendee screens but does not add an authorization boundary.

If a request rejects the operator session, a recovery dialog opens a fresh Fabric broker login. The underlying attendee form, game, and pending writes stay mounted. In-app navigation cannot leave a starting or active game, or its unsaved results, for management tools.

### Attendee identity

New adventurers select a country. The server generates a name and a five-character secret code, then returns the code once in the creation response. The app tells the attendee to photograph or screenshot it. It does not request real names, contact details, passwords, or inferred location.

The server generates a name from `rayfin/functions/src/player-name-words.txt`. The first use has no suffix; collisions append `2`, `3`, or the next number. A single SQL aggregate over the name/prefix finds that number inside the entry transaction.

Returning adventurers enter only the secret code. `normalizePlayerCode` trims, uppercases, removes spaces and hyphens, maps `I` and `L` to `1`, and maps `O` to `0`. The app rejects anything that is not exactly five characters from the Crockford base32 alphabet after normalization.

The server stores a deterministic scrypt verifier for the normalized code, not the code. The fixed salt is domain-separated for this app, so returning entry can look up the verifier without storing plaintext. `registerPlayer` accepts a strict `new`/`returning` request union and rejects contact fields, passwords, and the retired code and rune fields.

New entry uses a stable UUID request ID as the player ID. A retry with the same request ID after creation returns `PLAYER_ALREADY_CREATED` because the code can be shown only once. A failed creation that may not have committed keeps the same request ID for explicit retry.

`PlayerEntryState` serializes name and secret-code allocation and enforces a shared limit of 60 entry attempts per minute. Wrong codes do not identify a player, so there is no per-player lockout. Limits cover returning entry and creation replays without recording IP addresses or device identifiers. SQL unique constraints provide additional safeguards for names.

This is lightweight verification for supervised kiosks, not strong account authentication or one-person-one-entry enforcement. Forgotten codes produce a new identity. Existing players without a secret-code verifier cannot return; they must start a new adventure.

### Entry interface

The initial view is new entry, with the country picker and a link to returning entry. Returning entry shows an empty ticket with five secret-code slots and a link back to new entry. Before submitting, the page checks the country or code and focuses the first invalid field.

The secret-code input is a plain text field layered under the slots. It has `autocomplete="off"` so a kiosk browser does not suggest an earlier attendee's code, and it is not a password field, so the browser never offers to save it. Each slot shows `*` for a typed character, and the field drops characters that normalization cannot turn into the code alphabet. A verification mismatch clears the code. Network and operator-session failures keep it for explicit retry.

After creation succeeds, the reveal screen shows the generated name and code on a ticket and asks the attendee to photograph it, then **Begin trivia** continues. A failed creation locks its request ID and country, and offers a retry of the same request. The privacy footer shows the Terms and Conditions QR asset at `public/terms-qr.png`.

Station avatars face into the page: the entry avatar on the left is mirrored, and the bottom-right avatar on other routes keeps the image's original orientation. Entry styles stay scoped to the page; other routes retain their own scrolling and station-avatar behavior.

### Results actions

**Play Again** keeps the player, clears the game and selected pool, and returns to pool selection. **Reset** also clears the player and returns to the entry form. Both keep the operator session and station assignment.

### Generated names and countries

Builds generate the shared name module from `player-name-words.txt`. Retain words assigned to existing players unless a reviewed migration changes those identities. Editing the file does not rename stored players.

`country-names.txt` generates `countryNames.generated.ts` for the picker and backend validation. It contains printable ASCII names. `countries.ts` accepts exact approved names and maps seven legacy Unicode spellings to their ASCII equivalents.

New registrations store ASCII names. Reads return the canonical spelling without rewriting existing rows, and creation retries compare normalized values. Free-text locations, arbitrary accent variants, and missing countries are rejected. Keep the aliases while old records or queued events can reference them.

Both lists are bundled at build time without a runtime fetch. See [Edit names and countries](../CONTRIBUTING.md#edit-names-and-countries).

### Backend SQL identity

Every application entity declares one authenticated Data API read grant with an always-false row policy and no write grants. The generated policy is `@item.id ne @item.id`; `npm run schema:check` verifies that policy for all nine entities. Functions use parameterized `tedious` queries and an Entra application identity instead of the Data API.

The SQL hostname, database, tenant ID, client ID, and client secret are backend settings. The driver obtains the application's SQL token. Functions do not declare delegated SQL connections or request an operator SQL token. Missing application credentials fail explicitly, without an operator-SSO fallback.

Each invocation reads and validates the settings. A warm worker reuses one `ClientSecretCredential` while its tenant, client ID, and secret remain unchanged, allowing the SDK to reuse valid tokens. A setting change replaces that credential; invalid settings clear the cache. A failed SQL login discards its credential if it is still current. Concurrent invocations on a cold worker can each request a token.

Each warm worker keeps one SQL connection pool for the current server, database, and credential. The limits are in `SQL_POOL_LIMITS` in `rayfin/functions/src/sql.ts`: at most 10 connections, a 60-second wait for a free connection, a five-minute idle timeout, and a 30-minute maximum age. Before reuse, the pool resets the connection with `sp_reset_connection`, which restores fresh-login session settings and confirms the connection still works. A connection that fails that check, reports an error, or ends is replaced.

The pool records the expiry of the Entra token used for each login and stops reusing a connection five minutes before that token expires. It also discards a connection whose invocation left a request or transaction unfinished. A settings change or invalid settings retire the pool; idle connections close at once and in-use connections close when their invocation finishes.

Every operator uses the same backend SQL identity and shared database. Operators do not receive the credential or gain per-operator SQL privileges. The setup script grants access only to the application tables; see [Deployment](deployment.md#register-and-authorize-the-sql-identity).

The SQL implementation provides native transactions and locking across several statements. A replacement data-access implementation must retain atomic imports, serialized session writes, replayable results, and the private entity policies. Typed single-entity queries and mutations alone do not satisfy those requirements.

## Data model

| Entity | Stored information |
| --- | --- |
| `Player` | Generated name, selected country, secret-code verifier, and creation time |
| `PlayerEntryState` | Deployment-wide player-entry attempt window |
| `QuestionPool` | Pool slug, display name, artwork, and availability |
| `QuestionImport` | Import identity and content hash |
| `Question` | Question text, answers, and correct answer key |
| `QuestionPoolMembership` | Question-to-pool assignments |
| `GameSession` | Player, selected pool, session status, and totals |
| `SessionQuestion` | The session's immutable randomized draw |
| `GameSessionAnswer` | Accepted answers and score snapshots |

Entity definitions are registered in `rayfin/data/schema.ts`. The root package exports the compiled schema to make discovery explicit.

## Backend operations

`rayfin/functions/src/contracts.ts` defines the shared request and response types.

| Operation | Purpose |
| --- | --- |
| `registerPlayer` | Create a generated identity with a one-time secret code or verify a returning secret code |
| `listPools` | List active pools |
| `getPool` | Resolve a pool by slug |
| `createPool` | Create a display pool |
| `previewQuestionImport` | Validate a CSV and show pool destinations and previous imports without writing |
| `importQuestions` | Validate and atomically save a CSV import |
| `startSession` | Create a session and its draw |
| `getSessionQuestions` | Retrieve the complete saved draw |
| `submitAnswer` | Score and save an answer |
| `endSession` | Finalize the session using persisted answer totals |
| `trackTelemetryBatch` | Validate and forward telemetry |

The client sends JSON in a `payload` field. The SDK decodes the `FunctionResult<T>` response; `invokeOperation` returns its data or throws an `OperationError`. Callers must not parse an already-decoded result a second time.

## Consistency and retries

Session and import requests retain their identifiers across retries. Accepted answer retries return the original score snapshot, while conflicting submissions fail.

The browser gives `submitAnswer` and `endSession` 30 seconds per attempt. `GameWrites` sends answers serially and makes at most three attempts, with 0.5-second and 1-second backoff, before offering manual retry. Timing out does not cancel server execution. The same request payload is retained for idempotent retry. Other Functions keep the SDK's 250-second default timeout, including imports and session creation.

Per-session SQL locks serialize answers and completion. `submitAnswer` rejects new answers after the saved hearts reach zero, even before `endSession` runs; a retry of an accepted answer still returns its saved score. The frontend waits for pending answers before requesting completion. The backend returns retryable `SESSION_NOT_READY` when the requested completion counters are not yet persisted.

Imports validate all rows before committing. The operator preview shows destination counts, missing display pools, and previous imports of the exact file. Explicitly requested pool creation shares the import transaction. Existing pool metadata is preserved, including pools another operator creates after the preview.

Repeating an import identifier with the same content does not create another copy. Selecting a file again creates a new additive import, but repeated content requires explicit confirmation. A locked backend lookup prevents an unconfirmed duplicate when another import finishes after the preview. This is a warning and confirmation mechanism, not question-level deduplication. New imports do not change existing session draws.

Transactions use the driver's native begin, commit, and rollback methods. Transaction boundaries must not be split across separate `execSql` calls.

## Runtime limits

The complete application requires Fabric. The localhost frontend cannot authenticate an operator or save games. Local Functions routing alone does not satisfy this application's operator-authentication requirement. See [Development](../README.md#development).

Active games and pending writes are held in browser memory. Refreshing the page cannot resume them.

Each game stores an immutable copy of the entire selected pool in `SessionQuestions` and returns it to the browser. Storage per game and startup work grow with pool size. Test the largest planned pool on event devices; the CSV upload limit is not a guarantee of acceptable game-loading performance.

Telemetry is buffered in memory. Forwarding retries can create duplicates, but delivery is not guaranteed. Consumers must deduplicate by event ID and saved-operation identifiers. Player entry and private-code regions exclude interaction capture; the browser and publisher reject known credential and contact fields. Generated aliases and gameplay remain pseudonymous records. See [Telemetry](telemetry-events.md).
