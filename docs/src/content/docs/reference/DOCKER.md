# Docker Deployment Guide

This document describes how to build and run the IQ Challenge application using Docker.

## Overview

The application uses a multi-stage Docker build that:
1. Builds the .NET backend API
2. Builds the React frontend
3. Combines both into a single production container where the backend serves the static frontend files

## Files

- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development build (backend only)
- `docker-compose.yml` - Production setup (requires Azure Cosmos DB via .env)
- `docker-compose.local.yml` - Local testing setup with Cosmos DB Emulator
- `docker-compose.dev.yml` - Development setup (backend + Cosmos DB Emulator, frontend runs separately)
- `.env.example` - Template for environment variables
- `.dockerignore` - Excludes unnecessary files from Docker context

## Quick Start

### Local Testing Mode (Recommended for Testing)

Run the complete application with Cosmos DB Emulator (frontend + backend):

```bash
# Build and start all services (includes Cosmos DB Emulator)
./docker.sh local:up

# Access the application
# Frontend + API: http://localhost:8080
# Cosmos DB Emulator: https://localhost:8081/_explorer/index.html
```

### Production Mode (Azure Cosmos DB)

For production deployment with real Azure Cosmos DB:

```bash
# 1. Set up environment variables
cp .env.example .env
# Edit .env with your Azure Cosmos DB credentials

# 2. Start production environment
./docker.sh prod:up

# Access the application
# Frontend + API: http://localhost:8080
```

The backend API will serve the React frontend at `http://localhost:8080` and API endpoints at `http://localhost:8080/api/*`.

### Development Mode

For active development with hot reload:

```bash
# Start backend API + Cosmos DB in Docker
docker-compose -f docker-compose.dev.yml up --build

# In another terminal, run frontend locally
cd frontend
npm install
npm run dev
```

Access:
- Frontend (Vite dev server): http://localhost:5173
- Backend API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger
- Cosmos DB Emulator: https://localhost:8081/_explorer/index.html

## Building Images

### Production Image

```bash
# Build the multi-stage production image
docker build -t iq-challenge:latest .

# Run the production container
docker run -p 8080:8080 \
  -e CosmosDb__EndpointUri="YOUR_COSMOS_URI" \
  -e CosmosDb__PrimaryKey="YOUR_COSMOS_KEY" \
  iq-challenge:latest
```

### Development Image

```bash
# Build the development image (backend only)
docker build -f Dockerfile.dev -t iq-challenge-dev:latest .

# Run with volume mount for live reload
docker run -p 5000:5000 \
  -v $(pwd)/backend:/src/backend:ro \
  -e CosmosDb__EndpointUri="YOUR_COSMOS_URI" \
  -e CosmosDb__PrimaryKey="YOUR_COSMOS_KEY" \
  iq-challenge-dev:latest
```

## Architecture

### Multi-Stage Production Build

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Backend Build (dotnet/sdk:10.0-alpine)            │
│ - Restore NuGet packages                                     │
│ - Build and publish .NET API                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Frontend Build (node:22-alpine)                   │
│ - Install npm dependencies                                   │
│ - Build React app with Vite                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Final Image (dotnet/aspnet:10.0-alpine)           │
│ - Copy published API from Stage 1                           │
│ - Copy built frontend (dist/) to wwwroot/                   │
│ - Configure non-root user                                    │
│ - Expose port 8080                                           │
└─────────────────────────────────────────────────────────────┘
```

### How Static File Serving Works

In **production** (`ASPNETCORE_ENVIRONMENT=Production`), the backend is configured to:

1. Serve static files from `wwwroot/` directory
2. Use `UseDefaultFiles()` to serve `index.html` by default
3. Use `MapFallbackToFile("index.html")` to handle SPA routing

In **development** (`ASPNETCORE_ENVIRONMENT=Development`), the backend:

1. Only serves API endpoints
2. Enables Swagger UI
3. Allows CORS from any origin (for Vite dev server)

## Environment Variables

### Production Mode

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` with your Azure Cosmos DB credentials:

```env
COSMOS_DB_ENDPOINT_URI=https://your-account.documents.azure.com:443/
COSMOS_DB_PRIMARY_KEY=your-primary-key-here
COSMOS_DB_DATABASE_NAME=IQChallengeDb
CORS_ALLOWED_ORIGIN=https://your-domain.com
```

### Required for Production

- `COSMOS_DB_ENDPOINT_URI` - Azure Cosmos DB endpoint
- `COSMOS_DB_PRIMARY_KEY` - Azure Cosmos DB primary key

### Optional

- `ASPNETCORE_ENVIRONMENT` - `Development` or `Production` (default: `Production`)
- `ASPNETCORE_URLS` - Listening URLs (default: `http://+:8080`)
- `COSMOS_DB_DATABASE_NAME` - Database name (default: `IQChallengeDb`)
- `CORS_ALLOWED_ORIGIN` - Allowed CORS origin in production

### Local Testing

Local testing uses `docker-compose.local.yml` which includes the Cosmos DB Emulator with pre-configured credentials.

## Docker Compose Services

### Production (`docker-compose.yml`)

- **app**: Full application (backend + frontend)
- Connects to Azure Cosmos DB (configured via `.env` file)
- ⚠️ **Requires `.env` file with Azure Cosmos DB credentials**

### Local Testing (`docker-compose.local.yml`)

- **cosmosdb**: Azure Cosmos DB Emulator (for local testing)
- **app**: Full application (backend + frontend)
- Uses Cosmos DB Emulator connection string

### Development (`docker-compose.dev.yml`)

- **cosmosdb**: Azure Cosmos DB Emulator
- **api**: Backend API only (frontend runs separately with `npm run dev`)

## Health Checks

The container includes health check endpoints:

- `/health` - Full health status (includes Cosmos DB check)
- `/healthz` - Readiness check

Docker health check runs every 30 seconds:
```bash
curl -f http://localhost:8080/health || exit 1
```

## Troubleshooting

### Cosmos DB Emulator Connection Issues

The Cosmos DB Emulator uses a self-signed certificate. In development mode, the API is configured to accept it:

```csharp
// In Program.cs - automatically enabled for localhost connections
ServerCertificateCustomValidationCallback = 
    HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :8080
lsof -i :5000
lsof -i :8081

# Stop existing containers
docker-compose down
docker-compose -f docker-compose.dev.yml down
```

### Frontend Not Loading

1. Check if static files are in the container:
   ```bash
   docker exec -it iq-challenge-app ls -la /app/wwwroot
   ```

2. Verify environment is set to Production:
   ```bash
   docker exec -it iq-challenge-app env | grep ASPNETCORE_ENVIRONMENT
   ```

3. Check API logs:
   ```bash
   docker logs iq-challenge-app
   ```

### Build Failures

Clear Docker cache and rebuild:

```bash
docker-compose down -v
docker system prune -af
docker-compose up --build
```

## Deployment to Azure

### Azure Container Registry

```bash
# Login to ACR
az acr login --name yourregistry

# Build and push
docker build -t yourregistry.azurecr.io/iq-challenge:latest .
docker push yourregistry.azurecr.io/iq-challenge:latest
```

### Azure Container Apps

```bash
az containerapp create \
  --name iq-challenge \
  --resource-group your-rg \
  --environment your-env \
  --image yourregistry.azurecr.io/iq-challenge:latest \
  --target-port 8080 \
  --ingress external \
  --env-vars \
    ASPNETCORE_ENVIRONMENT=Production \
    CosmosDb__EndpointUri=secretref:cosmos-uri \
    CosmosDb__PrimaryKey=secretref:cosmos-key
```

### Azure App Service (Container)

```bash
az webapp create \
  --name iq-challenge \
  --resource-group your-rg \
  --plan your-plan \
  --deployment-container-image-name yourregistry.azurecr.io/iq-challenge:latest

az webapp config appsettings set \
  --name iq-challenge \
  --resource-group your-rg \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    CosmosDb__EndpointUri="YOUR_URI" \
    CosmosDb__PrimaryKey="YOUR_KEY"
```

## Performance Optimization

### Image Size

The production image uses Alpine Linux base images for minimal size:
- Base: `mcr.microsoft.com/dotnet/aspnet:10.0-alpine`
- Size: ~200-300 MB (including frontend assets)

### Security

- Runs as non-root user (`appuser:1000`)
- Minimal attack surface (Alpine Linux)
- No development tools in production image
- Health checks enabled

## Next Steps

- Set up CI/CD with GitHub Actions
- Configure production Cosmos DB connection
- Set up monitoring and logging
- Configure environment-specific settings
- Implement secrets management (Azure Key Vault)
