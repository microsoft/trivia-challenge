# Telemetry Events Reference

This document lists every analytics event that the Microsoft Fabric Trivia Challenge emits, along with their properties and context fields. Use this reference when building dashboards, running queries in Microsoft Fabric, or extending the telemetry system.

## How telemetry works

```
Frontend (browser)
  └─ analyticsService.ts
       ├─ Queues events in batches
       └─ POST /api/v{version}/telemetry/track  ──►  Backend (.NET API)
                                                        ├─ Validates & timestamps
                                                        └─ Forwards to Azure Event Hubs
                                                             └─ Microsoft Fabric (Real-Time Intelligence)
```

Every event is enriched with a **context** object (see [Common context fields](#common-context-fields)) before it is sent.

---

## Events

### `pageview.home`

Fired when the sign-in page is first displayed.

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | URL path, e.g. `"/"` |

**Event type:** `pageview`

---

### `user.register`

Fired when a player completes the registration form.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Unique user identifier |
| `name` | string | Player display name |
| `hasPhoneNumber` | boolean | Whether a phone number was provided |

**Event type:** `user`

---

### `game.start`

Fired when a new game session begins (after the 3-second countdown).

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique game session identifier |
| `questionCount` | number | Total questions available in the draw |
| `heartsRemaining` | number | Starting heart count |

**Event type:** `game`

---

### `game.answerquestion`

Fired every time the player submits an answer.

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Game session identifier |
| `questionId` | string | Question identifier |
| `category` | string | Question category |
| `answerIndex` | number | Index of the selected answer (0-based) |
| `isCorrect` | boolean | Whether the answer was correct |
| `responseTime` | number | Milliseconds between question display and answer |
| `remainingTimeSeconds` | number | Seconds remaining on the game timer |
| `questionNumber` | number | Ordinal position of the question in the session |
| `heartsRemaining` | number | Hearts remaining after this answer |
| `totalScore` | number | Cumulative score after this answer |
| `apiSuccess` | boolean | Whether the backend accepted the submission |
| `error` | string *(optional)* | Error message if the API call failed |

**Event type:** `game`

---

### `game.streakcompleted`

Fired when a player completes a streak (5 consecutive correct answers).

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Game session identifier |
| `streakLevel` | number | Which streak was completed (1–4) |
| `currentStreak` | number | Current streak counter value |
| `streakProgressAfterReset` | number | Streak progress after the counter resets |
| `heartsRemaining` | number | Hearts remaining |

**Event type:** `game`

---

### `game.ended`

Fired when the game ends (time runs out, hearts depleted, or all questions answered).

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Game session identifier |
| `questionsAnswered` | number | Total questions answered |
| `correctAnswers` | number | Number of correct answers |
| `streaksCompleted` | number | Number of completed streaks |
| `timeRemaining` | number | Seconds remaining when game ended |
| `heartsRemaining` | number | Hearts remaining when game ended |
| `gameOverReason` | string *(optional)* | Reason the game ended (e.g. `"time"`, `"hearts"`) |
| `apiSuccess` | boolean | Whether the backend accepted the session completion |

**Event type:** `game`

---

### `page.click`

Fired on every mouse click anywhere on the page (throttled to ~60 fps).

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Click X coordinate |
| `y` | number | Click Y coordinate |
| `button` | number | Mouse button (0 = left, 1 = middle, 2 = right) |
| `element` | string | Target element tag name |

**Event type:** `interaction`

---

### `page.touch`

Fired on every touch start event (throttled to ~60 fps).

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Touch X coordinate |
| `y` | number | Touch Y coordinate |
| `element` | string | Target element tag name |

**Event type:** `interaction`

---

### `page.keyboardkeydown`

Fired on every key press outside of input fields.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Key value (e.g. `"z"`, `"ArrowUp"`) |
| `code` | string | Key code (e.g. `"KeyZ"`) |
| `altKey` | boolean | Alt key held |
| `ctrlKey` | boolean | Ctrl key held |
| `metaKey` | boolean | Meta/Cmd key held |
| `shiftKey` | boolean | Shift key held |
| `element` | string | Target element tag name |

**Event type:** `interaction`

---

## Common context fields

Every event includes the following context object, automatically populated by the analytics service:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Full page URL |
| `path` | string | URL pathname |
| `language` | string | Browser language (e.g. `"en-US"`) |
| `userAgent` | string | Browser user-agent string |
| `viewport` | string | Viewport dimensions (e.g. `"1920x1080"`) |
| `screen` | string | Screen dimensions (e.g. `"1920x1080"`) |
| `sessionId` | string *(optional)* | Game session ID, if a session is active |
| `stationId` | string *(optional)* | Physical station identifier, read from a `stationId` cookie (see [Station ID Tracking](STATION_ID_TRACKING.md)) |

---

## Backend processing

The backend `POST /api/v{version}/telemetry/track` endpoint:

1. Validates required fields (`type`, `event`).
2. Validates that the client timestamp is not more than 5 minutes in the future.
3. Assigns a unique `eventId` and records `processedAtUtc`.
4. Forwards the event to Azure Event Hubs (when configured) for ingestion into Microsoft Fabric.
5. Returns a response with `eventId`, `processedAtUtc`, `forwarded` (boolean), and an optional `message`.

### Request schema

```json
{
  "type": "game",
  "event": "game.start",
  "userId": "user-123",
  "timestamp": "2025-11-12T07:46:20.924Z",
  "properties": { "sessionId": "abc", "questionCount": 20, "heartsRemaining": 5 },
  "context": { "url": "...", "stationId": "booth-01" }
}
```

### Response schema

```json
{
  "eventId": "evt-uuid",
  "processedAtUtc": "2025-11-12T07:46:21.000Z",
  "forwarded": true,
  "message": "Event processed successfully"
}
```

## Example Fabric / KQL queries

```kql
// Top 10 players by score
TelemetryEvents
| where event == "game.ended"
| extend score = toint(properties.correctAnswers) * 10
| top 10 by score desc

// Average response time per category
TelemetryEvents
| where event == "game.answerquestion"
| extend category = tostring(properties.category),
         responseTime = todouble(properties.responseTime)
| summarize avg(responseTime) by category

// Sessions per station
TelemetryEvents
| where event == "game.start"
| extend station = tostring(context.stationId)
| summarize sessions = count() by station
| order by sessions desc
```
