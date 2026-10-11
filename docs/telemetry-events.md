# Telemetry events

The application records page interactions and game events for analysis in Fabric. The browser queues events, the `trackTelemetryBatch` Function forwards them to Eventstream, and Eventhouse stores them in `TriviaTelemetry`.

Follow [Deployment](deployment.md) to provision the analytics resources and configure the publisher credential.

## Event contract

Every event carries a stable UUID `eventId`, `event`, `type`, client ISO `timestamp`, optional attendee `userId`, `properties`, and `context`. The publisher maps `event` to `eventName`, adds `eventType: "track"` and `ingestedAtUtc`, and preserves the dynamic properties and context. `ingestedAtUtc` is the publisher timestamp, not a receipt from Eventhouse. `type` is `pageview` for page views, `user` for registration and pool selection, `game` for game events, and `interaction` for clicks, touches, and keyboard events.

| Event | When emitted | Event-specific properties |
| --- | --- | --- |
| `pageview.home` | Registration page displayed | `path` |
| `pageview.select-pool` | Pool selection page loaded | `path` |
| `pool.selected` | Player chooses a pool | `poolId`, `poolName` |
| `user.register` | A new or returning adventurer enters the challenge | `userId`, generated `name`, selected `country`, `entryMode` |
| `game.start` | Session and draw loaded, countdown starting | `sessionId`, `questionCount`, `heartsRemaining` |
| `game.answerquestion` | Answer persistence attempt resolves | `sessionId`, `questionId`, `category`, `answerIndex`, `isCorrect`, `responseTime`, `remainingTimeSeconds`, `questionNumber`, `heartsRemaining`, `totalScore` on success, `apiSuccess`, optional `error` |
| `game.streakcompleted` | Streak progress reaches five | `sessionId`, `streakLevel`, `currentStreak`, `streakProgressAfterReset`, `heartsRemaining` |
| `game.ended` | Saved game completion | `sessionId`, `questionsAnswered`, `correctAnswers`, `streaksCompleted`, `timeRemaining`, `heartsRemaining`, `gameOverReason`, `apiSuccess` |
| `page.click` | Mouse click | `x`, `y`, `button`, `element` |
| `page.touch` | Touch start | `x`, `y`, `element` |
| `page.keyboardkeydown` | Eligible, non-repeating key press | `key`, `code`, modifier booleans, `element` |

`responseTime` is in milliseconds and `remainingTimeSeconds` is in seconds. Streak levels run from 1 to 5. Click and touch listeners share a 16 ms throttle. There is no mouse-movement listener.

### Context and attribution

Common context includes `url` and `path`. URL queries and fragments are stripped. Page-specific context may add `page`.

After player entry, every gameplay event includes the saved country. This is a manually selected name, not an inferred location. When available, context also includes `sessionId`, `poolId`, `poolName`, and the `stationId` cookie. See [Assign a station ID](operations.md#assign-a-station-id).

The event snapshots these fields and its top-level attendee `userId` before queueing. A later attendee cannot change the queued event's attribution. Resetting the player clears country attribution only for subsequent events.

### Privacy boundaries

All click, touch, and keyboard capture skips regions marked `data-telemetry-private`, including the player entry form and its secret-code field. Keyboard events also skip inputs, selects, textareas, editable content, and textbox roles. Non-control text keys are generalized.

The browser does not collect language, user agent, viewport, or screen dimensions. Both the browser queue and backend publisher reject known contact, credential, detailed-location, and browser-fingerprint fields, including nested fields.

Country fields accept the approved list and seven explicit legacy spellings. Both boundaries normalize the legacy names to ASCII before queueing or publishing. They reject arbitrary location strings and other accent variants. Historical Eventhouse data remains unchanged; reports must apply the [country-name mapping](operations.md#ascii-country-names) when combining it with new events. Other text is not transliterated.

The app-generated `user.register` event omits secret codes, code verifiers, passwords, and password verifiers. Its name must match the curated generated-name format. The creation request UUID becomes `userId`; it is not a secret.

The publisher rejects prohibited field names, but cannot detect a credential or personal information embedded in otherwise permitted text. These checks reduce accidental collection; they do not guarantee that arbitrary authenticated submissions contain no private information.

Generated aliases, player IDs, countries, stations, timestamps, and gameplay remain pseudonymous data. Restrict access and set retention before collecting them. Older events are not automatically sanitized or deleted. Review platform and network logs separately, and do not publish raw participant payloads in shared diagnostics.

## Delivery behavior

| Limit                     | Value                             |
| ------------------------- | --------------------------------- |
| Browser queue             | 500 events or 2 MiB               |
| One event                 | 16 KiB UTF-8 JSON                 |
| Browser batch             | 50 events or 96 KiB               |
| Backend request           | 50 events or 128 KiB              |
| Event Hubs producer batch | 64 KiB                            |
| Default flush interval    | 5 seconds                         |
| Retry lifetime            | 10 minutes or 8 attempts          |
| Backoff                   | Exponential, capped at 30 seconds |

The backend validates known event/type pairs, UUIDs, timestamps, and bounded JSON before publishing. It uses UTF-8 JSON buffers and `eventId` as the Event Hubs message ID. It acknowledges IDs only after the publisher send succeeds. Transport failures return sanitized errors.

Delivery can repeat an event after an uncertain acknowledgment. Deduplicate by `eventId`. The `TriviaEvents()` KQL function in [infra/telemetry.kql](../infra/telemetry.kql) deduplicates the full table; the queries below filter the raw table first to limit the rows being aggregated. Application retries can also create different event IDs for one saved answer or completion. Deduplicate those by their session/question or session ID before reporting.

Delivery is best effort, not guaranteed. Queued events survive attendee reset in the same tab, but not tab closure or refresh. Events can also expire or exceed queue limits.

The operator page at `/operator` reports queued, acknowledged, and dropped counts with the last failure for the current browser tab. Finish and save the current game before navigating there. An acknowledgment confirms forwarding, not Eventhouse ingestion. An empty queue does not by itself prove that events arrived.

## Confirm delivery

1. Complete a game on the deployed application and wait for its result to save.
2. In the Fabric workspace, open the `triviachallenge-events` Eventstream. Confirm that its `TriviaEventhouseData` destination is `Running`.
3. Open the `TriviaChallengeTelemetry` KQL database and run the following query.

Replace `<your-deployed-https-origin>` with the app origin from the active deployment registry:

```kql
let appOrigin = "<your-deployed-https-origin>";
TriviaTelemetry
| where timestamp > ago(2h)
| where tostring(context.url) startswith strcat(appOrigin, "/")
| where eventName in ("game.start", "game.answerquestion", "game.ended")
| summarize arg_max(ingestedAtUtc, *) by eventId
| summarize eventNames=make_set(eventName), latestEvent=max(timestamp)
    by sessionId=tostring(context.sessionId), stationId=tostring(context.stationId)
| order by latestEvent desc
```

The completed session should have start, answer, and end events, with the expected station assignment. Publisher acknowledgments in **Kiosk operator setup** do not replace this ingestion check.

### Command-line verification

The read-only verifier provides additional event counts and game totals. Set the deployment's workspace and hosting origin, then use the session identifier returned by the query above:

```bash
export WORKSPACE_ID="<your-workspace-id>"
export APP_ORIGIN="<your-deployed-https-origin>"
export SESSION_ID="<completed-game-session-id>"
export STATION_ID="<your-station-label>"
node scripts/provision-telemetry.mjs \
  --workspace-id "$WORKSPACE_ID" --verify \
  --app-origin "$APP_ORIGIN" \
  --session-id "$SESSION_ID" --station-id "$STATION_ID"
```

Use an empty `STATION_ID` if the browser has no station assignment. The command queries the last two hours and checks for all three lifecycle event names when a session is specified. It does not generate test events.

If the CLI reports `KUSTO_AUTH_REQUIRED`, use the authenticated Fabric query editor instead. For the detailed counts, open [infra/telemetry-verify.kql](../infra/telemetry-verify.kql) and replace its `declare query_parameters` line with `let` bindings for `appOrigin`, `sessionId`, and `stationId`. Browser tokens do not need to be copied.

### Destination configuration

The provisioning script configures the following destination properties:

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| Destination    | `TriviaEventhouseData`                           |
| Ingestion mode | `ProcessedIngestion`                             |
| Target item    | The `TriviaChallengeTelemetry` KQL database item |
| Table          | `TriviaTelemetry`                                |
| Input format   | JSON encoded as UTF-8                            |

The destination's `itemId` identifies the KQL database, not the parent Eventhouse. Provisioning reuses owned resources without overwriting their definitions. If an existing destination differs, review its configuration in Fabric before making changes.

## Example report queries

Run these queries against `TriviaChallengeTelemetry`, replacing the app origin. Each query filters raw events to the reporting window before deduplicating deliveries and saved operations. Do not use the unbounded `TriviaEvents()` function for frequent report refreshes without measuring its query cost.

### Response time by category

```kql
let appOrigin = "<your-deployed-https-origin>";
TriviaTelemetry
| where timestamp > ago(1d) and eventName == "game.answerquestion"
| where tostring(context.url) startswith strcat(appOrigin, "/")
| where tobool(properties.apiSuccess) == true
| summarize arg_max(ingestedAtUtc, *) by eventId
| extend sessionId = tostring(properties.sessionId),
    questionId = tostring(properties.questionId)
| where isnotempty(sessionId) and isnotempty(questionId)
| summarize arg_max(timestamp, *) by sessionId, questionId
| summarize averageResponseMs=avg(todouble(properties.responseTime))
    by category=tostring(properties.category)
```

### Started sessions by station

```kql
let appOrigin = "<your-deployed-https-origin>";
TriviaTelemetry
| where timestamp > ago(1d) and eventName == "game.start"
| where tostring(context.url) startswith strcat(appOrigin, "/")
| summarize arg_max(ingestedAtUtc, *) by eventId
| extend sessionId = tostring(properties.sessionId)
| where isnotempty(sessionId)
| summarize arg_max(timestamp, *) by sessionId
| summarize sessions=count() by station=tostring(context.stationId)
```

These filters scope a report; they do not enforce access control. Events originate in an authenticated browser and are not a tamper-proof audit log. Use saved SQL records when authoritative game totals are required.
