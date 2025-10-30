# Microsoft Fabric IQ Challenge

A quiz web application where players assess their Microsoft Fabric knowledge through an engaging, time-pressured quiz game.

## 🎯 Overview

- **Purpose**: Help Microsoft Ignite attendees assess their knowledge about Microsoft Fabric
- **Format**: Interactive quiz game with time pressure and streak bonuses
- **Tech Stack**: React + TypeScript + .NET 10 + Azure Cosmos DB + Microsoft Fabric

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Option 1: Docker Local Testing (Quickest)

Run the complete application with Cosmos DB Emulator:

```bash
# Clone and start
git clone https://github.com/microsoft/iq-challenge.git
cd iq-challenge
./docker.sh local:up

# Access at http://localhost:8080
```

This builds and runs both frontend and backend with a local Cosmos DB Emulator.

For production with Azure Cosmos DB, see [DOCKER.md](DOCKER.md).

See [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) for quick start guide.

### Option 2: Dev Container (Recommended for Development)

### Quick Start with Dev Container

1. Clone the repository:
   ```bash
   git clone https://github.com/microsoft/iq-challenge.git
   cd iq-challenge
   ```

2. Open in VS Code:
   ```bash
   code .
   ```

3. When prompted, click "Reopen in Container" (or press `F1` → "Dev Containers: Reopen in Container")

4. Wait for the container to build and start (~5-10 minutes first time)

5. Once ready, start the services:
   ```bash
   # Terminal 1: Start the .NET API
   cd backend/IQChallenge.Api
   dotnet run

   # Terminal 2: Start the frontend
   npm run dev
   ```

6. Access the application:
   - **Frontend**: http://localhost:5173
   - **API**: http://localhost:5000
   - **API Docs**: http://localhost:5000/swagger
   - **Cosmos DB Explorer**: https://localhost:8081/_explorer/index.html

### What's Included in Dev Container

- ✅ Node.js 22 with TypeScript
- ✅ .NET 10 SDK
- ✅ Azure Cosmos DB Emulator (with auto-configuration)
- ✅ Azure Static Web Apps CLI
- ✅ All required VS Code extensions

See [.devcontainer/README.md](.devcontainer/README.md) for detailed devcontainer documentation.

## 📁 Project Structure

```
iq-challenge/
├── .devcontainer/          # Dev container configuration
│   ├── devcontainer.json   # VS Code dev container config
│   ├── docker-compose.yml  # Docker Compose setup
│   ├── Dockerfile          # Custom dev container image
│   └── post-create.sh      # Setup script
├── backend/                # .NET 10 API
│   └── IQChallenge.Api/    # Main API project
├── docs/                   # Documentation (Astro)
├── frontend/               # React + TypeScript (TODO)
└── infrastructure/         # Azure deployment (TODO)
```

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: .NET 10 Minimal API with versioning
- **Database**: Azure Cosmos DB (local emulator for development)
- **Analytics**: Microsoft Fabric for real-time telemetry
- **Hosting**: Azure Static Web Apps + Azure App Service Container

## 🎮 Game Features

- **Time Pressure**: Base 1 minute timer with streak bonuses (up to 2 minutes total)
- **Difficulty Levels**: Easy/Medium/Hard with forgiving progression
- **Leaderboards**: Daily and cumulative rankings
- **Telemetry**: Comprehensive tracking of all interactions
- **Input Methods**: Touch, mouse, and keyboard support (Z/C/B/M keys)

## 🔧 Development

### Development Modes

#### Docker Development Mode
```bash
# Start backend + Cosmos DB in Docker
./docker.sh dev:up

# Start frontend dev server (in another terminal)
./docker.sh dev:frontend
```

#### Manual Development Mode
```bash
# Terminal 1: Backend
cd backend/IQChallenge.Api
dotnet run

# Terminal 2: Frontend
cd frontend
npm run dev
```

### API Endpoints

The API uses versioned endpoints with the pattern: `api/v{version}/{resource}`

- **Users**: `POST /api/v1.0/users/register`, `GET /api/v1.0/users/{email}`
- **Sessions**: `POST /api/v1.0/sessions`, `POST /api/v1.0/sessions/{id}/complete`
- **Questions**: `POST /api/v1.0/questions/upload`, `GET /api/v1.0/questions/draw/{seed}`

See API documentation at http://localhost:5000/swagger when running.

### Database Schema

- **Users**: Email (PK), Name, Phone
- **Questions**: Question text + Answer
- **QuestionDraws**: Randomized question sets with seed-based reproducibility
- **GameSessions**: Links users to draws with scores

### Running Tests

```bash
# Backend tests
cd backend/IQChallenge.Api.Tests
dotnet test

# Frontend tests
npm test
```

## 📦 Docker & Deployment

### Docker Development & Testing

See [DOCKER.md](DOCKER.md) for comprehensive Docker documentation including:
- Multi-stage production builds
- Development vs Production modes
- Docker Compose setup
- Azure deployment guides
- Troubleshooting tips

Quick commands:
```bash
./docker.sh help           # Show all commands
./docker.sh local:up       # Start local test environment (with Cosmos Emulator)
./docker.sh prod:up        # Start production environment (needs .env with Azure Cosmos DB)
./docker.sh dev:up         # Start development environment
./docker.sh clean          # Clean up Docker resources
```

### Azure Deployment

Deploy the application to Azure Container Registry and Azure Web Apps:

```bash
# Quick deployment (saves configuration for reuse)
./quick-deploy.sh dev              # Deploy to development
./quick-deploy.sh staging          # Deploy to staging
./quick-deploy.sh prod --tag v1.0.0  # Deploy to production with version

# Manual deployment with full control
./deploy-image.sh <acr-name> \
  --resource-group <resource-group> \
  --app-name <app-service-name> \
  --image-tag latest
```

The deployment scripts will:
1. Build the Docker image from the Dockerfile
2. Push the image to your Azure Container Registry
3. Update and restart the Azure Web App to pull the latest image

See [DEPLOY-IMAGE.md](DEPLOY-IMAGE.md) for detailed deployment documentation.

## �📚 Documentation

- [Docker Deployment Guide](DOCKER.md)
- [Dev Container Setup](.devcontainer/README.md)
- [API Specifications](docs/specs/)
- [Architecture Overview](docs/src/content/docs/product/overview.md)

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
