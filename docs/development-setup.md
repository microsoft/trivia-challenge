# Development Environment Setup

This guide walks you through setting up your local development environment for the Microsoft Fabric Trivia Challenge. You will be able to run the full application stack locally, including the frontend, backend API, and a Cosmos DB Emulator.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | Container runtime for Dev Containers and local Cosmos DB Emulator |
| [Visual Studio Code](https://code.visualstudio.com/) | Code editor |
| [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) | VS Code extension for developing inside containers |

## Option A — Dev Container (Recommended)

The Dev Container provides a fully configured environment with all dependencies pre-installed.

### 1. Clone the repository

```bash
git clone https://github.com/microsoft/trivia-challenge.git
cd trivia-challenge
```

### 2. Open in VS Code

```bash
code .
```

### 3. Reopen in Container

When VS Code detects the `.devcontainer/` folder it will show a prompt. Click **"Reopen in Container"**, or open the command palette (`F1`) and select **Dev Containers: Reopen in Container**.

### 4. Wait for the build

The first build takes approximately 5–10 minutes. The `post-create.sh` script will automatically:

- Install Node.js dependencies
- Install Azure Static Web Apps CLI
- Wait for the Cosmos DB Emulator to be ready
- Download and trust the emulator's SSL certificate
- Restore .NET dependencies

### 5. Start the services

Open two terminals inside VS Code:

```bash
# Terminal 1 — Start the .NET API
cd backend/TriviaChallenge.Api
dotnet run
```

```bash
# Terminal 2 — Start the React frontend
npm run dev
```

### 6. Access the application

| Service | URL |
|---------|-----|
| Frontend (Vite dev server) | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Swagger UI | http://localhost:5000/swagger |
| Cosmos DB Data Explorer | https://localhost:8081/_explorer/index.html |

### What the Dev Container includes

- Node.js 22 with TypeScript
- .NET 10 SDK
- Azure Cosmos DB Emulator (auto-configured with SSL certificate trust)
- Pre-installed VS Code extensions for C#, TypeScript, ESLint, and Prettier

For troubleshooting certificate issues, port conflicts, and emulator problems, see [.devcontainer/README.md](../.devcontainer/README.md).

---

## Option B — Docker Compose (Quick local testing)

Use this option for a fast, self-contained test of the full application without installing SDKs.

### 1. Clone and start

```bash
git clone https://github.com/microsoft/trivia-challenge.git
cd trivia-challenge
./docker.sh local:up
```

### 2. Access the application

| Service | URL |
|---------|-----|
| Application (frontend + API) | http://localhost:8080 |
| Cosmos DB Data Explorer | https://localhost:8081/_explorer/index.html |

### 3. Other useful commands

```bash
./docker.sh local:logs    # Stream container logs
./docker.sh local:down    # Stop and remove containers
./docker.sh health        # Check application health
./docker.sh clean         # Remove all containers, volumes, and images
```

### Development mode with Docker

If you want to run the backend in Docker but develop the frontend locally with hot-reload:

```bash
# Start backend API + Cosmos DB Emulator
./docker.sh dev:up

# In a second terminal, start the frontend dev server
./docker.sh dev:frontend
```

| Service | URL |
|---------|-----|
| Frontend (Vite dev server) | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Swagger UI | http://localhost:5000/swagger |
| Cosmos DB Data Explorer | https://localhost:8081/_explorer/index.html |

---

## Option C — Manual setup (No Docker for app code)

If you prefer to install toolchains directly on your host machine, you need:

- [Node.js 22+](https://nodejs.org/)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Azure Cosmos DB Emulator — either a [local install](https://aka.ms/cosmosdb-emulator) or the Docker image

### 1. Start the Cosmos DB Emulator (Docker)

```bash
docker run -p 8081:8081 -p 10251-10254:10251-10254 \
  -m 3g --cpus=2.0 --name=cosmos-emulator \
  -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 \
  -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=true \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
```

### 2. Start the backend

```bash
cd backend/TriviaChallenge.Api
dotnet run
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment variables

The backend reads Cosmos DB settings from `appsettings.json` (or environment variables). For local development the defaults point to the emulator:

| Variable | Default (Emulator) |
|----------|---------------------|
| `CosmosDb__EndpointUri` | `https://localhost:8081` |
| `CosmosDb__PrimaryKey` | Emulator well-known key |
| `CosmosDb__DatabaseName` | `TriviaChallengeDb` |

For production deployments, see the [Infrastructure Deployment Guide](deploying-infrastructure.md) and [Code Deployment Guide](deploying-code.md).

## Running tests

```bash
# Backend
cd backend/TriviaChallenge.Api.Tests
dotnet test

# Frontend
npm test
```

## Next steps

- [Deploying Infrastructure](deploying-infrastructure.md) — provision Azure resources with Bicep
- [Deploying Code](deploying-code.md) — build and deploy the application to Azure
- [Telemetry Events Reference](telemetry-events.md) — understand the analytics events
