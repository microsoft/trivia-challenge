# Microsoft Fabric Trivia Challenge

<a href="https://github.com/features/copilot"><img src="docs/images/built-with-github-copilot.png" alt="Built with GitHub Copilot" width="240"></a>

A sample quiz application for supervised event kiosks. Players answer Microsoft Fabric questions against the clock, earn time through streaks, and review incorrect answers.

The application uses React and TypeScript, Rayfin Functions, a Fabric SQL database, and Fabric Real-Time Intelligence for telemetry.

> [!IMPORTANT]
>
> This version requires the Rayfin preview in Microsoft Fabric. Run the complete game in a Fabric deployment. Local builds and tests are supported; local gameplay and offline operation are not. This is a replacement for the earlier .NET and Cosmos DB implementation, not an in-place data migration.

## Overview

The sample demonstrates a React application backed by Rayfin Functions, transactional Fabric SQL storage, and Eventstream telemetry delivered to Eventhouse. Function invocation relies on Fabric gateway authentication, not the browser's sign-in controls.

- Play a timed quiz using touch, mouse, or the keyboard.
- Create question pools and import questions from UTF-8 CSV files.
- Sign in each kiosk operator with their own Fabric account. Attendees do not need Fabric accounts.
- Create pseudonymous adventurers using generated names and one-time secret codes.
- Save game results in SQL and analyze events in Eventhouse.

Question banks, players, and saved games live in the application's **SQL database**. Analytics events live in the **KQL database** under Eventhouse. The repository does not include a Power BI report or an anonymous report-embedding service.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 and npm.
- [Git](https://git-scm.com/).
- A Fabric workspace with supported capacity and access to the Rayfin preview, Functions, SQL database, Eventstream, and Eventhouse.
- Permission to deploy the app and analytics resources, plus administrator help to authorize a dedicated SQL application identity.

Command examples use Bash. On Windows, use Git Bash or WSL.

### Set up the application

1. Clone the repository and install both sets of dependencies using [Deploy the application](docs/deployment.md#1-install-dependencies-and-the-cli).
2. Follow the rest of the deployment guide to deploy the app, connect analytics, and configure backend credentials. Deployment creates or updates billable cloud resources.
3. Open `https://<your-app-host>/operator`. Select **Sign in operator with Fabric**, then **Load questions and create pools**.
4. Follow [Prepare and import questions](docs/questions.md). Use [examples/questions.csv](examples/questions.csv) or select **Use sample questions** to start with four questions. Preview and confirm the import; questions are not loaded automatically.
5. Follow [Run a kiosk](docs/operations.md) to assign a station ID and complete a game with each operator account before admitting attendees.

### Player flow

New adventurers choose a country or region. Registration reveals a generated adventurer name and a five-character secret code. Attendees should photograph or screenshot the code, then select **Begin trivia**.

Returning adventurers enter only their secret code. After a game, wait for the result to finish saving. **Play Again** starts another game for the same adventurer. **Reset** returns to the new-challenge entry form for the next attendee. The entry page expects the Terms and Conditions QR image at `public/terms-qr.png`.

The app does not request names or contact details from attendees. Generated identities, selected countries, and linked gameplay remain pseudonymous data. Review access, retention, and public-reporting requirements before collecting or publishing them.

## Development

After installing dependencies, run these checks from the repository root:

```bash
npm run build
npm run build:functions
npm run schema:check
npm test
npm run lint
```

`npm run dev:frontend` serves the UI at `http://127.0.0.1:5173`, without working Fabric sign-in or gameplay. `npm run dev` starts a Fabric-backed Rayfin workflow that can change cloud resources. Use a dedicated test workspace, not an event workspace.

See [Contributing](CONTRIBUTING.md) for targeted tests, editable country and name lists, and documentation requirements.

## Project structure

| Path                | Contents                                            |
| ------------------- | --------------------------------------------------- |
| `src/`              | React pages, game state, timer, and client services |
| `public/`           | Logos, station avatars, and pool icons              |
| `rayfin/data/`      | SQL entity definitions                              |
| `rayfin/functions/` | Backend Functions and their tests                   |
| `scripts/`          | Deployment configuration and analytics provisioning |
| `infra/`            | Telemetry table definitions and KQL queries         |
| `examples/`         | Sample question CSV                                 |
| `docs/`             | Deployment, operator, and developer documentation   |

## Documentation

| Guide | Use it to |
| --- | --- |
| [Deployment](docs/deployment.md) | Prerequisites, first deployment, updates, and backend configuration |
| [Excel and CSV questions](docs/questions.md) | Spreadsheet layout, answer keys, pools, metadata, and import errors |
| [Kiosk operation](docs/operations.md) | Operator sign-in, station IDs, player handoff, and troubleshooting |
| [Architecture](docs/architecture.md) | Components, game rules, data storage, and request handling |
| [Telemetry](docs/telemetry-events.md) | Event reference, delivery monitoring, privacy, and report queries |
| [Contributing](CONTRIBUTING.md) | Make, validate, and submit code or documentation changes |

## Limitations

- This sample is designed for supervised kiosks, not adversarial or prize-bearing competitions. The browser receives answer keys and controls the game timer.
- A secret code identifies a returning adventurer. It does not prove a person's identity or enforce one entry per person.
- All authorized operator sessions can load questions. The app has no separate question-administrator role.
- Active games and pending writes are held in browser memory. Refreshing or closing a tab cannot resume them.
- Telemetry is best effort. A saved SQL result does not guarantee delivery to a report.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement declaring that you have the right to grant us the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

Read [Contributing](CONTRIBUTING.md) before opening a pull request.

When you submit a pull request, a CLA bot determines whether you need to provide a CLA. Follow its instructions. You only need to do this once across repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information, see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com).

See [Support](SUPPORT.md) for help, [Security](SECURITY.md) for vulnerability reporting, and [LICENSE](LICENSE) for the MIT license.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions must not cause confusion or imply Microsoft sponsorship. Third-party trademarks and logos are subject to those third parties' policies.
