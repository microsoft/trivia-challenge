# Run a kiosk

Set up a supervised station, admit players, and recover interrupted requests without losing pending game state. Complete [deployment](deployment.md) and [question import](questions.md) first.

## Start a station

1. Open the deployed app in the kiosk browser.
2. Select **Sign in operator with Fabric** and complete sign-in using the authorized operator account.
3. Wait for the attendee registration page to appear.
4. [Assign a station ID](#assign-a-station-id), then complete the [opening checks](#before-opening-to-attendees).
5. Leave the browser open for successive players.

The operator signs in once per browser session. Attendees use the adventurer entry screen and do not need Fabric accounts.

Turn off autofill in the kiosk browser profile. Returning attendees type a secret code at a shared station, and saved form data could be offered to a later attendee. The code field is not a password field, so browsers do not offer to save it.

Each operator uses their own Fabric account with permission to run the same deployed app. The backend uses a separate application identity for SQL, so operators do not enter or share a database credential. All stations still use the same database and Eventstream. Assign each kiosk its own station ID for the shared scoreboard.

## Enter as an adventurer

### New players

1. On the default entry screen, select **Choose your country / region**. Use **Find your country...** to search, then select a listed name with a click or the arrow keys and Enter.
2. Select **Start a new challenge**. A ticket with the generated adventurer name and secret code replaces the form.
3. Tell the attendee to photograph or screenshot the ticket. The code will not be shown again.
4. Select **Begin trivia**.

The secret code is the only thing a returning attendee needs. It is not displayed again, stored in browser storage, or published in telemetry. The Terms and Conditions QR image is loaded from `public/terms-qr.png` in the entry footer.

If creation is interrupted, keep the tab open and select **Retry**. The app keeps the request ID and country so a lost response does not create another identity. **Start a new challenge** abandons that local retry; it cannot recover the previous code.

### Returning players

From new-player entry, select **Have your secret code? Enter it here**.

1. Type the code from the attendee's photo into the **Secret code** slots. Each character shows as `*`. Then select **Continue**.

A mismatch clears the code and asks the attendee to check the photo or start a new challenge. Connection or operator-session failures keep the code; select **Continue** again to retry.

A shared limit of 60 entry attempts per minute applies across stations. Wrong codes do not identify a player, so there is no per-player lockout.

Forgotten codes cannot be recovered. **Forgot your code? Start a new challenge** creates a different identity, so several identities can belong to one person. Existing adventurers without a secret-code verifier cannot return either; ask them to start a new challenge.

### Names and countries

Generated names are public aliases. A collision adds `2`, `3`, or the next sequence number. Returning players do not type the name; they use the secret code.

The app saves the selected country or region with the player and includes it in gameplay analytics. It does not infer location from GPS, IP addresses, or browser settings. Returning players keep their saved country. The app has no real-name or contact fields.

See [Edit names and countries](../CONTRIBUTING.md#edit-names-and-countries) before changing the approved lists. Removing or renaming a saved country without a compatibility mapping can block returning entry and reject queued telemetry. Deploy the frontend and Functions together after changing the list.

The streak icons come from `@fabric-msft/svg-icons`. Review Microsoft's [icon usage terms](https://learn.microsoft.com/fabric/fundamentals/icons) and the [name word banks](../rayfin/functions/src/player-name-words.txt) before publication. The implementation is not legal or trademark clearance.

### ASCII country names

The picker, new player records, and new telemetry use these spellings:

| Previous spelling     | ASCII spelling        |
| --------------------- | --------------------- |
| Åland Islands         | Aland Islands         |
| Côte d’Ivoire         | Cote d'Ivoire         |
| Curaçao               | Curacao               |
| Réunion               | Reunion               |
| Saint Barthélemy      | Saint Barthelemy      |
| São Tomé and Príncipe | Sao Tome and Principe |
| Türkiye               | Turkiye               |

Existing players can still return with an old saved spelling. The backend returns the equivalent ASCII name without changing the stored row. A separate reviewed SQL update is needed to change existing `Players.country` values. Historical Eventhouse events also keep their original values; apply this mapping in the report if old and new events must share a map label. ASCII spelling alone does not guarantee that a map recognizes a country.

## Open operator setup

Open this address directly or bookmark it for staff:

```text
https://<your-app-host>/operator
```

The operator page contains Fabric sign-in/sign-out, **Load questions and create pools**, and telemetry delivery status. Select **Continue to the challenge** to return to attendee registration or the current result. The question-loading page also has a **Back to operator setup** link.

Attendee screens have no operator setup button or management links. When sign-in is required, they show only the operator sign-in and recovery controls, not imports, sign-out, or telemetry diagnostics.

Finish and save the current game before opening operator setup. In-app navigation to `/operator` or question loading during a game or pending save returns to the active game or results. Entering an address or opening a bookmark reloads the app, so do not do that while a game or save is in progress.

This separates staff tools from attendee screens; it does not add an administrator role or an additional permission check. Anyone using an authorized operator browser session can open `/operator` when no game is pending.

## Assign a station ID

Add a `stationId` query parameter to the deployed app URL:

```text
https://<your-app-host>/?stationId=booth-01
```

The app saves the value in a `stationId` cookie for 365 days. Later visits reuse that value. Open the app with a different value to change the assignment, or remove the cookie through browser settings to clear it.

Use an equipment or booth label, not personal information. Telemetry includes this value so reports can distinguish stations.

These station IDs also display an avatar:

| Station ID          | Avatar             |
| ------------------- | ------------------ |
| `dashboarddruid`    | Dashboard Druid    |
| `insightsalchemist` | Insights Alchemist |
| `quantumqueryist`   | Quantum Queryist   |

Other station IDs still provide attribution without an avatar.

### Require a station assignment

Set `VITE_REQUIRE_STATION_ID=true` in the deployment's `.env.local` and redeploy. A build with this option blocks registration and gameplay until the browser has a station ID.

Set `VITE_STATION_LOCKDOWN_MESSAGE` to customize the blocked-screen message. Copy the options you need from [.env.example](../.env.example) while preserving any deployment-generated values already in `.env.local`.

These options are applied at build time. Station lockdown is a kiosk control, not a replacement for authentication.

## Between players

Wait for the result to finish saving. The results screen offers two actions:

- **Play Again** keeps the current adventurer and returns to pool selection, so they do not enter their secret code again.
- **Reset** clears the adventurer and game state and returns to an empty entry form for the next attendee.

Both keep the operator session and station assignment. The results screen asks players to select **Reset** if there is a line behind them.

Keep the tab open while answers or results are saving. If a save fails, select **Retry saving** during gameplay or **Retry saving results** on the results screen. Refreshing or closing the tab loses pending in-memory state; the application cannot resume the game after a refresh.

Each answer or completion request has a 30-second client timeout and up to three attempts. Three stalled attempts take about 92 seconds, including backoff, before manual retry is available for that write. Earlier queued answers and SDK authentication refresh can add to the total wait. A timeout does not cancel a server-side write; retries reuse the same payload so an already-saved operation is not counted twice.

If the operator session expires or a request rejects it, use **Sign in operator with Fabric** in the recovery dialog, then retry saving. The attendee form, game, and pending writes stay in the same tab. Do not navigate to `/operator`, sign out, or reload to recover a pending game.

## Before opening to attendees

1. Sign in with each operator's own account, including a non-builder account.
2. Confirm the station assignment and intended question pool.
3. Complete a game using the station's input controls and wait for its result to save.
4. Select **Play Again** and confirm that pool selection or instructions open without a new sign-in. Finish that game, select **Reset**, and confirm the next attendee receives an empty entry form.
5. Check [telemetry delivery](telemetry-events.md#confirm-delivery) for that station and any separately configured scoreboard.

Test the largest planned question pool on the event devices and network. Each game saves a copy of the complete pool as its immutable draw, then downloads it before gameplay. Both storage per game and startup work grow with pool size.

The app no longer requests attendee contact details, but generated identities, timestamps, and linked gameplay are pseudonymous data. Confirm the privacy notice, legal basis, access controls, retention/deletion policy, and public-display policy with the responsible privacy owner. Review platform access logs separately; the app cannot guarantee that hosting or identity infrastructure processes no personal data.

Removing contact fields from the application does not erase information collected by older versions. Review historical SQL data, Eventhouse data, exports, and backups separately before sharing reports. Do not expose secret-code or password verifiers to Power BI.

## Operator troubleshooting

| Problem | Action |
| --- | --- |
| No question pools appear | Create an active display pool with the same slug used in the CSV. See [Import questions](questions.md#3-create-the-pool-and-import). |
| The app shows a station restriction | Supply `stationId` in the app URL or correct the build-time station setting. |
| An import reports row errors | Follow the [CSV error reference](questions.md#limits-and-errors). |
| The result is still saving | Keep the tab open. After a failure, select **Retry saving results** before handing the station to another player. Use **Retry saving** for failed answers during gameplay. |
| Operator authentication expires | Sign in again in the same tab, then retry the pending save. |
| Sign-in works, but SQL operations fail on every station | Ask the deployment owner to check the backend application credential, its expiry, and SQL permissions. Signing an operator in again does not renew the application's client secret. Keep tabs with pending writes open. |
| Fabric says the app is intended only for its builder because of SSO Functions | Ask the deployment owner to follow [Switch SQL authentication](deployment.md#switch-sql-authentication). Extra SQL permissions for the operator do not remove an app sign-in restriction. |
| A secret code cannot be verified | Check the attendee's photo and retype the code. Create a new adventurer if the code is lost. |
| Creation failed after submitting | Retry the same creation request in the open tab to recover an already-created identity. |
| Telemetry is queued or dropped | After the current game is saved, open `/operator` to inspect delivery status and follow the [telemetry guide](telemetry-events.md). |

## Pool artwork

The **Existing icon path** field accepts an asset path. These pool icons are included:

```text
/pools/default.svg
/pools/fabric-basics.svg
/pools/fabric.png
/pools/fabric.svg
/pools/ignite-2026.svg
/pools/sql.svg
```

## External links

The results screen shows QR codes for the existing public resources:

| Destination           | URL                           |
| --------------------- | ----------------------------- |
| Leaderboard           | https://aka.ms/trivia-powerbi |
| Fabric learning       | https://aka.ms/fabrictrivia/f |
| Fabric certifications | https://aka.ms/eu/cert        |

The repository does not contain the leaderboard report. These links are defined in `src/pages/ResultsPage.tsx`; deploying another instance does not connect that report to the new instance's data.
