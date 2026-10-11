# Deploy the application

Deploy the frontend and Functions, configure the application's SQL identity, and connect telemetry to Eventhouse. At the end, each authorized kiosk operator should be able to sign in, complete a game, and save its result.

Run commands from the repository root in Bash. Replace values in angle brackets with values from your environment.

> [!IMPORTANT]
>
> Deployment and provisioning change cloud resources and can incur charges. Use a dedicated test workspace for first-time setup. Do not deploy to an active kiosk or apply database changes while games or saves are in progress.

## Prerequisites

Install [Node.js 24 and npm](https://nodejs.org/) and [Git](https://git-scm.com/). On Windows, use Git Bash or WSL. Confirm the following with your Fabric administrator:

| Requirement | What is needed |
| --- | --- |
| Capacity | A workspace assigned to capacity that supports Fabric workloads. An existing Premium P capacity can be used when Fabric is enabled. |
| Tenant settings | **Users can create Fabric items** and **Fabric Apps preview** enabled for the deploying account. Capacity-level settings must also permit Fabric items. |
| Workloads | Access to Rayfin, its Functions and SQL services, Eventstream, and Eventhouse in the target tenant and region. |
| Permissions | Permission to create and update the application and analytics items. SQL database creation requires workspace Member or Admin permissions. |
| Operator account | A Fabric account authorized to run the deployed application. This account signs in on the kiosk; attendees do not need Fabric accounts. |
| SQL application identity | A single-tenant Entra app registration, permission to grant it SQL access, and approval to use a backend client secret. A Fabric administrator must allow this service principal through the relevant tenant setting. |

See Microsoft's [Fabric capacity documentation](https://learn.microsoft.com/fabric/enterprise/licenses#capacity) and [SQL database prerequisites](https://learn.microsoft.com/fabric/database/sql/create#prerequisites).

## 1. Install dependencies and the CLI

Clone the repository:

```bash
git clone https://github.com/microsoft/trivia-challenge.git
cd trivia-challenge
```

Install both sets of locked dependencies, including development dependencies:

```bash
npm ci --include=dev &&
  npm --prefix rayfin/functions ci --include=dev &&
  npx rayfin --version
```

The frontend and Functions have separate lockfiles. The `@microsoft/rayfin-cli` development dependency supplies the `rayfin` executable. `--include=dev` includes the deployment tools.

Continue only after both installations succeed and the version command prints the installed CLI version. If installation fails, see [Troubleshooting](#troubleshooting).

## 2. Select the deployment target

| Variable | Where to find it |
| --- | --- |
| `TENANT_ID` | Your Microsoft Entra tenant's **Tenant ID**, available from the tenant overview or your administrator. |
| `WORKSPACE_URI` | The full Fabric portal URL for the target workspace, for example `https://app.fabric.microsoft.com/groups/<workspace-id>/list`. Use the correct Fabric portal host for your environment. |

```bash
export TENANT_ID="<your-tenant-id>"
export WORKSPACE_URI="<your-fabric-workspace-url>"
npx rayfin login --tenant "$TENANT_ID" --select
npx rayfin login status
```

Confirm that the reported account and tenant are the intended deployment identity.

For a new environment, use a fresh checkout without another environment's `.env.local`, `rayfin/.env`, or `rayfin/.deployments.json`. Review `services.auth.allowedRedirectUris` in `rayfin/rayfin.yml` and remove origins that do not belong to the deployment. The CLI adds the new hosting origin during deployment.

Rayfin records each deployment in the ignored `rayfin/.deployments.json` registry. The top-level `active` value selects the entry used by the helper scripts below. Use `npx rayfin up list` to view recorded deployments and `npx rayfin up switch <workspace>` to change the active one before configuring analytics or backend secrets.

## 3. Deploy the application

```bash
RAYFIN_FEATURE_FLAGS=functions npx rayfin up \
  --tenant "$TENANT_ID" \
  --workspace-uri "$WORKSPACE_URI"
npx rayfin up status
```

The `functions` flag enables the Functions deployment workflow in the pinned CLI. The workspace URI lets Rayfin derive both the workspace ID and Fabric API environment. The deployment builds the frontend and Functions, applies the SQL schema, and records its configuration in `rayfin/.deployments.json`.

Use a `*.fabric.microsoft.com` workspace URL, not a `*.powerbi.com` URL. The tenant ID selects the directory; the portal host selects the Fabric environment. Do not substitute an API endpoint for the workspace URL.

Record the following values for later steps:

| Variable | Where to find it |
| --- | --- |
| `APP_ORIGIN` | `hostingUrl` in the active entry of `rayfin/.deployments.json`. Use the HTTPS origin without a path, query string, or trailing slash. |
| `SQL_DATABASE_ID` | Open the deployed application's SQL child item in Fabric and copy that item's identifier from its URL. Use the application-owned SQL database, not another database in the workspace. |

```bash
export APP_ORIGIN="<deployed-https-origin>"
export SQL_DATABASE_ID="<application-sql-database-id>"
```

The app is not ready for players yet. Complete analytics and backend configuration below.

The helper scripts read the workspace, tenant, app, and endpoint information from the active deployment registry entry. Optional `--workspace-id` and `--app-id` arguments are safety checks; they must match that entry.

The helpers derive the Fabric REST environment from the entry's `fabricDeepLink`. The registry's `fabricApiUrl` normally identifies the app's regional workload endpoint, not the Fabric REST root. Do not replace it with `https://api.fabric.microsoft.com/v1`. For legacy entries without a portal link, the helpers accept a first-party REST endpoint or use production when the API URL is also absent.

## 4. Provision analytics

Choose one path. Reuse existing analytics items when they already belong to this deployment; do not create a duplicate pipeline for each operator.

### Reuse existing analytics

If Git sync or an earlier deployment restored the analytics items, skip provisioning:

```bash
export EVENTSTREAM_ID="<existing-eventstream-id>"
```

Open the Eventstream in Fabric. Confirm that it contains exactly one `CustomEndpoint` source named `TriviaApp` and that its destination reaches the intended Eventhouse table and is running. Step 5 reads the source's publisher credential without replacing items or changing topology.

### Create analytics

Preview the selected environment, workspace, and resource names:

```bash
node scripts/provision-telemetry.mjs
```

Review the output, then apply:

```bash
node scripts/provision-telemetry.mjs --apply
```

The script creates these items:

| Item             | Name                        |
| ---------------- | --------------------------- |
| Eventhouse       | `triviachallenge-analytics` |
| KQL database     | `TriviaChallengeTelemetry`  |
| Eventstream      | `triviachallenge-events`    |
| Eventhouse table | `TriviaTelemetry`           |

Copy `eventstreamId` from the script's JSON output:

```bash
export EVENTSTREAM_ID="<created-eventstream-id>"
```

In Fabric, open the Eventstream and confirm that its `TriviaEventhouseData` destination reaches `Running`. Newly created resources can take time to initialize.

The script reuses resources that it owns. It refuses name collisions with unrelated items and does not overwrite existing definitions. Use separate workspaces for independent deployments; these analytics names are fixed.

## 5. Configure the backend

### Register and authorize the SQL identity

Operator sign-in and SQL authentication are separate. Operators keep their own Fabric accounts. The Functions use one Entra application identity to connect to the shared SQL database.

| Identity | Access required |
| --- | --- |
| Deployment account | Create and update app resources and configure backend secrets |
| Backend Entra application | Connect to the app's SQL database and use its nine application tables |
| Kiosk operator | Run and interact with the Fabric app using their own account |
| Attendee | No Fabric account; uses the operator-authenticated kiosk |

#### Create the application credential

1. In the [Entra admin center](https://entra.microsoft.com/), switch to the deployment tenant.
2. Open **Entra ID** > **App registrations** > **New registration**. Create a dedicated single-tenant app, such as `trivia-sql-backend`, without a redirect URI.
3. Record its **Directory (tenant) ID** and **Application (client) ID**.
4. Open **Certificates & secrets** > **Client secrets** > **New client secret**. Choose an approved expiry, then select **Add**.
5. Copy the **Value**, not the Secret ID, to your approved credential store. Record its expiry and arrange rotation before that date.

This implementation uses a client secret. Microsoft recommends certificate or federated credentials for production applications. If your organization prohibits client secrets, stop; this sample does not implement those alternative credential flows.

#### Grant database and operator permissions

1. Ask the Fabric administrator to allow this service principal through **Service principals can call Fabric public APIs**, also called **Service principals can use Fabric APIs** in the [SQL authentication guidance](https://learn.microsoft.com/fabric/database/sql/authentication). Scope access to an approved security group.
2. Open the SQL database child item under the trivia Fabric app. Use **Share** or **Manage permissions** to grant the Entra application **Read** item permission, without additional **Read all data** permissions.
3. Connect to that database as an authorized database administrator using SSMS or the MSSQL extension for VS Code. Use its SQL hostname and database name, not the item ID. The Rayfin child item's portal editor is read-only.
4. Review [grant-sql-identity.sql](../scripts/grant-sql-identity.sql). Replace `<application-client-id>` with the client ID you recorded, then run the file against that database.
5. Grant each kiosk operator **Run and interact** access to the Fabric app. Do not distribute the application's client secret to operators.

The SQL script creates a database user and grants table-level reads, inserts, and updates. It does not grant `db_owner`, schema changes, deletes, or access to Rayfin authentication tables. [Fabric item permission changes can take up to two hours](https://learn.microsoft.com/fabric/database/sql/share-sql-manage-permission#limitations) to take effect.

Use the correct database for each task:

| Item                     | Used for                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| Application SQL database | Questions, players, sessions, answers, and the SQL grants above       |
| SQL analytics endpoint   | Analytical access; not the application's transactional write endpoint |
| Eventhouse KQL database  | Telemetry queries and report data; not player or question storage     |

Fabric item Read permission and SQL table grants are separate requirements. See [SQL authentication](https://learn.microsoft.com/fabric/database/sql/authentication), [database sharing](https://learn.microsoft.com/fabric/database/sql/share-sql-manage-permission), and [Entra application credentials](https://learn.microsoft.com/entra/identity-platform/how-to-add-credentials).

### Upload the backend settings

Create a local credential file with owner-only permissions:

```bash
umask 077
touch .env.sql-auth.local
chmod 600 .env.sql-auth.local
```

In a local editor, add these values to `.env.sql-auth.local`. This file is Git-ignored. Do not put credentials in `.env.example`, chat, command-line arguments, or any `VITE_*` setting.

```dotenv
TRIVIA_SQL_TENANT_ID=<deployment-tenant-id>
TRIVIA_SQL_CLIENT_ID=<application-client-id>
TRIVIA_SQL_CLIENT_SECRET="<client-secret-value>"
```

Then upload the backend settings:

```bash
node --env-file=.env.sql-auth.local scripts/configure-backend.mjs \
  --sql-database-id "$SQL_DATABASE_ID" \
  --eventstream-id "$EVENTSTREAM_ID"
```

The script requires all three application settings before contacting Fabric. It checks that the application's tenant matches the active deployment, verifies the deployment account's sign-in tenant, resolves the SQL connection information and existing Eventstream publisher credential, and writes these values to the backend secret store:

| Setting | Purpose |
| --- | --- |
| `TRIVIA_SQL_SERVER` | Fabric SQL hostname |
| `TRIVIA_SQL_DATABASE` | Application database name |
| `TRIVIA_SQL_TENANT_ID` | Entra tenant containing the backend application |
| `TRIVIA_SQL_CLIENT_ID` | Backend application's client ID |
| `TRIVIA_SQL_CLIENT_SECRET` | Private application credential used to obtain a SQL token |
| `TRIVIA_EVENTHUB_CONNECTION_STRING` | Private Eventstream publisher connection, including `EntityPath` |

The output lists configured setting names without exposing their values. The SQL driver obtains a token for the application identity. It does not use the operator's SQL token or SQL username/password authentication. The uploader updates named secrets without removing other backend settings. Secret updates are separate requests; if one fails, resolve the error and rerun the command before opening the kiosks.

Rotate the client secret before it expires. Capture a replacement, update the protected local file, rerun this upload, and verify a saved game before revoking the old secret. Secret rotation does not require a code change. Keep the local credential file only as long as your approved credential-management process requires.

Warm Function workers reuse the backend credential and its in-memory token cache. Each invocation reads the settings again and selects a new credential if the tenant, client ID, or secret changes. Revoking a secret does not necessarily invalidate issued tokens or open SQL connections. Do not rely on secret revocation alone for immediate access removal; follow your organization's incident-response procedure.

## 6. Load questions and run a game

1. Open `/operator` on the hosting URL from step 3.
2. Select **Sign in operator with Fabric** and complete sign-in.
3. On the operator setup page, select **Load questions and create pools**. Bookmark `/operator` for staff; attendee screens have no operator setup button.
4. Follow the [question import guide](questions.md). No questions or pools are created at startup.
5. Return to registration, complete a game, and wait for its saved result.
6. Follow [Confirm telemetry delivery](telemetry-events.md#confirm-delivery) to check that the game events reached Eventhouse.

Repeat sign-in and a saved game with a non-builder operator in a private browser window. Then check each kiosk operator's own account and station. If you have connected a separate scoreboard, confirm that the result reaches it. Deployment health and a successful builder login do not prove that other operators can sign in.

In the test deployment, verify that the Fabric gateway rejects Function requests without authentication and from accounts without app access. Also verify that direct Data API requests return no application records and permit no writes. The browser's sign-in screen and local schema checks do not prove deployed authorization enforcement. See [Operator access](architecture.md#operator-access).

The deployment is ready for a kiosk when operator sign-in, registration, question loading, saved results, and telemetry delivery work in that environment. Configure the station using [Run a kiosk](operations.md).

## Update an existing deployment

### Switch SQL authentication

Older Functions declared SQL SSO connections and used the executing operator's SQL token. Configure the application identity and permissions from step 5 before deploying this version. Then run the full deployment from step 3 to replace the Function connection metadata as well as the code. Uploading credentials alone does not remove the old SSO declarations.

There is no fallback to operator SQL SSO. Missing, expired, or unauthorized application credentials block SQL operations for every station. Keep the existing database and analytics items; do not create a separate deployment per operator.

If Fabric displayed a builder-only SSO warning, verify that it disappears for a non-builder operator after deployment. This change removes the app's delegated SQL dependency, but a local build cannot establish whether the Fabric sign-in restriction has cleared.

### Review the contact-free player schema

The player-entry implementation replaces the old `Player` contact columns with a generated `name`, a required selected `country`, and an optional `secretCodeHash`. It also introduces the private `PlayerEntryState` entity. The application will not work correctly against the old email-based schema.

Review the generated schema changes and existing data before deployment. Existing player rows do not have secret-code verifiers; there is no automatic conversion or account-recovery migration in this repository. Do not invent placeholder email addresses, fabricate codes for existing rows, or use `--force` to bypass this decision. The credential-schema change below is a separate, reviewed column removal.

Review `rayfin/functions/src/country-names.txt` before deployment. New players must select an approved country; it is saved and included in analytics. Rows without a country need a separately reviewed data transition, not an invented default. Builds generate the picker and backend allowlist from the same TXT file. Deploy frontend and Functions together, and preserve names used by existing players unless their records are migrated.

Country labels now use printable ASCII. The [seven renamed countries](operations.md#ascii-country-names) have explicit aliases for existing players and queued telemetry. Deploy frontend and Functions together, finish active games, and reload idle kiosks before using the new labels. Old frontend builds do not recognize the new spellings returned by the updated backend. Deployment does not rewrite existing SQL country values or historical Eventhouse events; review those updates separately with the database and report owners.

Any destructive migration, removal of historical contact fields, or cleanup of old SQL/Eventhouse/exported data requires a separate authorized plan. Updating application code alone does not erase previously collected information. Run `npm run schema:check` locally to check entity discovery and private policies; this does not apply the schema to Fabric.

### Replace return codes, rune spells, and passwords with secret codes

From `main`, this version removes the `Player` columns `playerCode`, `runeHash`, `runeVersion`, `failedAttempts`, and `attemptWindowStartedAt`, and adds optional `secretCodeHash`. If an earlier password build was deployed, the plan also drops `passwordHash`. Returning players enter only a generated secret code. Deploy the frontend, Functions, schema, and the Terms QR asset at `public/terms-qr.png` together.

Dropping the columns deletes every stored return-code, rune, password, and attempt-window verifier. Rayfin blocks that change unless you confirm it. `--force` accepts every destructive operation in the plan, so first confirm that the plan drops only the expected credential columns and adds `secretCodeHash`. Then add `--force` to the deployment command from step 3:

```bash
RAYFIN_FEATURE_FLAGS=functions npx rayfin up \
  --tenant "$TENANT_ID" \
  --workspace-uri "$WORKSPACE_URI" \
  --force
```

Existing player rows keep their name, country, and game history but have no secret code, so they cannot return. Those attendees must start a new challenge. No credential conversion runs automatically. Finish active games and reload idle kiosks after deployment.

### Deploy reviewed changes

Keep that environment's private deployment files. Sign in to its tenant, set `TENANT_ID` and `WORKSPACE_URI`, and run the full deployment command from step 3. This applies code, configuration, and schema changes together.

Use `npx rayfin up switch <workspace>` before running the telemetry and backend helper scripts if the checkout records more than one deployment. Use a separate checkout for another tenant or environment. Do not copy one environment's private deployment files into another.

Review any destructive schema change before using `--force`. Routine deployment does not require it.

## Troubleshooting

| Problem | Action |
| --- | --- |
| `npx rayfin` reports npm E404 for `rayfin` | Run [Install dependencies and the CLI](#1-install-dependencies-and-the-cli) from the repository root. The required package is `@microsoft/rayfin-cli`, and development dependencies must be included. |
| Package installation fails | Check access to `https://registry.npmjs.org/` and the exact package version in the lockfile. Do not change dependency versions to bypass the error. |
| Rayfin or a required workload is unavailable | Ask the tenant administrator to confirm preview access, capacity settings, region support, and your permissions. |
| Backend configuration reports a registry mismatch | Compare the supplied tenant, workspace, app, and selected Rayfin deployment with the active entry in `rayfin/.deployments.json`. |
| A helper reports that no active deployment is selected | Run `npx rayfin up list`, then `npx rayfin up switch <workspace>` to select the intended registry entry. |
| A helper refuses the Fabric API URL | Redeploy or switch to the intended workspace to refresh its registry entry. Confirm that `fabricDeepLink` identifies the correct Fabric environment, workspace, and app. Do not replace a regional workload URL with a REST API URL. |
| A helper reports a tenant mismatch | Run `npx rayfin login --tenant <deployment-tenant-id>` for the active deployment before configuring analytics or backend secrets. |
| Question imports or registration fail with SQL errors | Confirm that `SQL_DATABASE_ID` belongs to this app, all application settings are present, the client secret is valid, and the service principal has both SQL item Read and the table grants from step 5. |
| Fabric reports a builder-only app because its Functions use SSO | Confirm the updated Functions and connection metadata were deployed, not just the backend secrets. Try a fresh non-builder session. If the same banner remains, stop and collect a redacted error for the Fabric owner; do not widen database permissions as a substitute for resolving app sign-in. |
| Telemetry destination is not running | Inspect the Eventstream destination in Fabric and follow the [telemetry guide](telemetry-events.md#confirm-delivery). |
| Localhost reports unsupported Fabric sign-in | Use the deployed hosting URL. Local gameplay is not supported. |

An initial deployment provisions the application's SQL database. Later deployments update that app. Neither path imports legacy data or configures the external leaderboard report.
