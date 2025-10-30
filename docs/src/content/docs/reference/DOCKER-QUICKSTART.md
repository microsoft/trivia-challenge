# Docker Quick Start Guide

> **Note**: Docker commands must be run from your **host machine** (not inside the devcontainer), as the devcontainer doesn't have Docker-in-Docker enabled.

## Prerequisites

Ensure Docker Desktop is installed and running on your host machine:
- **macOS/Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

## Quick Commands

### From Your Host Machine Terminal

```bash
# Navigate to the project directory
cd /path/to/iq-challenge

# Local testing mode (complete app + Cosmos Emulator)
./docker.sh local:up         # Start application with emulator
./docker.sh local:logs       # View logs
./docker.sh local:down       # Stop application

# Production mode (complete app + Azure Cosmos DB)
cp .env.example .env         # First time only: create .env
# Edit .env with Azure Cosmos DB credentials
./docker.sh prod:up          # Start application
./docker.sh prod:logs        # View logs
./docker.sh prod:down        # Stop application

# Development mode (API + database only)
./docker.sh dev:up           # Start backend + Cosmos DB
./docker.sh dev:logs         # View logs
./docker.sh dev:down         # Stop services

# Other useful commands
./docker.sh health           # Check health status
./docker.sh clean            # Clean up all Docker resources
./docker.sh help             # Show all commands
```

## Access Points

### Local Testing Mode (`./docker.sh local:up`)
- **Application**: http://localhost:8080 (frontend + API)
- **Health Check**: http://localhost:8080/health
- **Cosmos DB Emulator**: https://localhost:8081/_explorer/index.html

### Production Mode (`./docker.sh prod:up`)
- **Application**: http://localhost:8080 (frontend + API)
- **Health Check**: http://localhost:8080/health
- **Note**: Uses Azure Cosmos DB (no local emulator)

### Development Mode (`./docker.sh dev:up`)
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **Health Check**: http://localhost:5000/health
- **Cosmos DB Emulator**: https://localhost:8081/_explorer/index.html
- **Frontend**: Run separately in devcontainer with `npm run dev` → http://localhost:5173

## Recommended Workflow

### Option 1: Local Testing (Testing Production Build)
Run from **host machine** with Cosmos DB Emulator:
```bash
./docker.sh local:up
# Access at http://localhost:8080
```

### Option 2: Production Testing (Azure Cosmos DB)
Run from **host machine** with real Azure Cosmos DB:
```bash
# First time: create .env file
cp .env.example .env
# Edit .env with your Azure Cosmos DB credentials

# Start production
./docker.sh prod:up
# Access at http://localhost:8080
```

### Option 3: Hybrid (Active Development)
1. From **host machine** - Start backend + database:
   ```bash
   ./docker.sh dev:up
   ```

2. From **devcontainer** - Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access:
   - Frontend: http://localhost:5173 (hot reload)
   - API: http://localhost:5000

### Option 4: Pure Devcontainer (No Docker)
From **devcontainer** only:
```bash
# Terminal 1: Backend
cd backend/IQChallenge.Api
dotnet run

# Terminal 2: Frontend
cd frontend
npm run dev
```

Note: Requires Cosmos DB Emulator running on host or in devcontainer.

## Environment Configuration

### For Production (Azure Cosmos DB)

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Azure Cosmos DB credentials:
   ```env
   COSMOS_DB_ENDPOINT_URI=https://your-account.documents.azure.com:443/
   COSMOS_DB_PRIMARY_KEY=your-primary-key-here
   COSMOS_DB_DATABASE_NAME=IQChallengeDb
   CORS_ALLOWED_ORIGIN=http://localhost:8080
   ```

3. **Important**: Never commit `.env` to version control!

### For Local Testing

No `.env` file needed - `./docker.sh local:up` uses the Cosmos DB Emulator automatically.

## Building for Deployment

From **host machine**:
```bash
# Build production image
docker build -t iq-challenge:latest .

# Test the image
docker run -p 8080:8080 \
  -e CosmosDb__EndpointUri="https://your-cosmos.documents.azure.com:443/" \
  -e CosmosDb__PrimaryKey="your-key" \
  iq-challenge:latest

# Push to registry (if needed)
docker tag iq-challenge:latest yourregistry.azurecr.io/iq-challenge:latest
docker push yourregistry.azurecr.io/iq-challenge:latest
```

## Troubleshooting

### "Cannot connect to Docker daemon"
You're likely inside the devcontainer. Exit and run from your host machine:
```bash
# Exit devcontainer (Ctrl+D or type exit)
exit

# Then run Docker commands
./docker.sh prod:up
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :8080  # or :5000, :5173

# Stop existing containers
./docker.sh prod:down
./docker.sh dev:down
```

### Frontend Not Loading in Production
```bash
# Rebuild with fresh build
./docker.sh clean
./docker.sh prod:up
```

### View Container Logs
```bash
# Production
docker logs -f iq-challenge-app

# Development
docker logs -f iq-challenge-api-dev
docker logs -f iq-challenge-cosmosdb-dev
```

## File Structure

```
iq-challenge/
├── Dockerfile                  # Multi-stage production build
├── Dockerfile.dev              # Development backend build
├── docker-compose.yml          # Production: app + cosmos
├── docker-compose.dev.yml      # Development: api + cosmos
├── docker.sh                   # Helper script
├── .dockerignore              # Build optimization
├── DOCKER.md                   # Full documentation
└── DOCKER-QUICKSTART.md       # This file
```

## Quick Reference

| Task | Command | Run From |
|------|---------|----------|
| Local testing | `./docker.sh local:up` | Host |
| Production (Azure) | `./docker.sh prod:up` | Host (needs .env) |
| Start development | `./docker.sh dev:up` | Host |
| Start frontend dev | `npm run dev` | Devcontainer |
| Build image | `docker build -t iq-challenge .` | Host |
| View logs | `./docker.sh local:logs` | Host |
| Stop services | `./docker.sh local:down` | Host |
| Clean everything | `./docker.sh clean` | Host |

## Next Steps

- 📖 Read [DOCKER.md](DOCKER.md) for detailed documentation
- 🔧 Read [DOCKER-SETUP.md](DOCKER-SETUP.md) for implementation details
- 🚀 Set up CI/CD with [.github/workflows/docker-build.yml](.github/workflows/docker-build.yml)
