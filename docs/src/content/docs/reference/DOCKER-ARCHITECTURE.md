# Docker Architecture Overview

## Multi-Stage Build Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DOCKERFILE (Multi-Stage Build)                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Stage 1: Backend Build                                              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Base: mcr.microsoft.com/dotnet/sdk:10.0-alpine                  │ │
│ │                                                                   │ │
│ │ 1. Copy iq-challenge.sln                                         │ │
│ │ 2. Copy .csproj files                                            │ │
│ │ 3. dotnet restore                                                │ │
│ │ 4. Copy backend/ source code                                     │ │
│ │ 5. dotnet publish -c Release                                     │ │
│ │                                                                   │ │
│ │ Output: /app/publish/IQChallenge.Api.dll + dependencies          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 2: Frontend Build                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Base: node:22-alpine                                             │ │
│ │                                                                   │ │
│ │ 1. Copy frontend/package*.json                                   │ │
│ │ 2. npm ci                                                        │ │
│ │ 3. Copy frontend/ source code                                    │ │
│ │ 4. npm run build (Vite build)                                    │ │
│ │                                                                   │ │
│ │ Output: /app/dist/ (index.html, assets/, etc.)                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 3: Final Runtime Image                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Base: mcr.microsoft.com/dotnet/aspnet:10.0-alpine               │ │
│ │                                                                   │ │
│ │ 1. COPY --from=backend-build /app/publish → /app/               │ │
│ │ 2. COPY --from=frontend-build /app/dist → /app/wwwroot/         │ │
│ │ 3. Create non-root user (appuser:1000)                          │ │
│ │ 4. Configure health check                                        │ │
│ │ 5. EXPOSE 8080                                                   │ │
│ │ 6. ENTRYPOINT ["dotnet", "IQChallenge.Api.dll"]                 │ │
│ │                                                                   │ │
│ │ Final Structure:                                                 │ │
│ │   /app/                                                          │ │
│ │   ├── IQChallenge.Api.dll      ← Backend                        │ │
│ │   ├── (dependencies)                                             │ │
│ │   └── wwwroot/                 ← Frontend                        │ │
│ │       ├── index.html                                             │ │
│ │       ├── assets/                                                │ │
│ │       │   ├── index-abc123.js                                    │ │
│ │       │   └── index-xyz789.css                                   │ │
│ │       └── ...                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Production Runtime Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     Container: iq-challenge-app                     │
│                         Port: 8080                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │          ASP.NET Core Application                          │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  Request Pipeline (Program.cs)                      │   │   │
│  │  │                                                      │   │   │
│  │  │  1. UseExceptionHandling()                         │   │   │
│  │  │  2. UseDefaultFiles()        ← Serves index.html   │   │   │
│  │  │  3. UseStaticFiles()         ← Serves wwwroot/*    │   │   │
│  │  │  4. UseRequestLogging()                            │   │   │
│  │  │  5. UseResponseCompression()                       │   │   │
│  │  │  6. UseCors()                                      │   │   │
│  │  │  7. UseRateLimiter()                               │   │   │
│  │  │  8. MapHealthChecks()        ← /health, /healthz   │   │   │
│  │  │  9. MapUserEndpoints()       ← /api/v1.0/users/*   │   │   │
│  │  │ 10. MapSessionEndpoints()    ← /api/v1.0/sessions/*│   │   │
│  │  │ 11. MapQuestionEndpoints()   ← /api/v1.0/questions/*│  │   │
│  │  │ 12. MapFallbackToFile()      ← /* → index.html     │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Request Routing:                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ GET /                        → /app/wwwroot/index.html       │ │
│  │ GET /assets/index-abc123.js  → /app/wwwroot/assets/...      │ │
│  │ GET /play                    → /app/wwwroot/index.html (SPA)│ │
│  │ GET /results                 → /app/wwwroot/index.html (SPA)│ │
│  │ POST /api/v1.0/users/...     → Backend API Handler          │ │
│  │ GET /api/v1.0/questions/...  → Backend API Handler          │ │
│  │ GET /health                  → Backend Health Check         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            ↓
                   ┌────────────────┐
                   │  Cosmos DB     │
                   │  (Azure/Local) │
                   └────────────────┘
```

## Development vs Production Comparison

```
╔═══════════════════════════════════════════════════════════════════╗
║                      DEVELOPMENT MODE                             ║
╚═══════════════════════════════════════════════════════════════════╝

┌─────────────────────┐         ┌─────────────────────┐
│  Backend Container  │         │  Host Machine       │
│  (Port 5000)        │         │  Frontend Dev       │
│                     │         │  (Port 5173)        │
│  - .NET API only    │◄────────┤                     │
│  - Swagger UI       │  HTTP   │  - Vite dev server  │
│  - Hot reload       │         │  - HMR enabled      │
│  - CORS: Allow all  │         │  - Proxy API calls  │
└─────────┬───────────┘         └─────────────────────┘
          │
          │
          ↓
┌─────────────────────┐
│  Cosmos DB          │
│  Container          │
│  (Port 8081)        │
└─────────────────────┘

Developer Access:
  • Frontend:  http://localhost:5173  (Vite with HMR)
  • API:       http://localhost:5000  (Swagger enabled)
  • Cosmos DB: https://localhost:8081 (Web explorer)

Commands:
  Host:        ./docker.sh dev:up
  Devcontainer: npm run dev (in frontend/)

╔═══════════════════════════════════════════════════════════════════╗
║                      PRODUCTION MODE                              ║
╚═══════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────┐
│  Single Container (Port 8080)                                    │
│                                                                   │
│  ┌──────────────────────┐                                        │
│  │  Backend (.NET API)  │                                        │
│  │  + Frontend (Static) │                                        │
│  │                      │                                        │
│  │  - Serves wwwroot/*  │                                        │
│  │  - API endpoints     │                                        │
│  │  - SPA routing       │                                        │
│  │  - Optimized build   │                                        │
│  │  - No Swagger        │                                        │
│  │  - CORS restricted   │                                        │
│  └──────────┬───────────┘                                        │
└─────────────┼────────────────────────────────────────────────────┘
              │
              ↓
      ┌───────────────┐
      │  Cosmos DB    │
      │  (Azure Prod) │
      └───────────────┘

User Access:
  • Application: http://localhost:8080  (Single endpoint)
  • Health:      http://localhost:8080/health

Commands:
  Host: ./docker.sh prod:up
```

## Docker Compose Architectures

### Production (docker-compose.yml)

```
┌──────────────────────────────────────┐
│  Docker Network: iq-challenge-network│
│                                       │
│  ┌────────────────┐                  │
│  │   cosmosdb     │                  │
│  │  Port: 8081    │                  │
│  └────────┬───────┘                  │
│           │                           │
│           ↓                           │
│  ┌────────────────┐                  │
│  │   app          │                  │
│  │  Port: 8080    │                  │
│  │  (Full Stack)  │                  │
│  └────────────────┘                  │
└──────────────────────────────────────┘

Services:
  • cosmosdb: Azure Cosmos DB Emulator
  • app:      Built from Dockerfile (backend + frontend)

Access:
  • http://localhost:8080  → Application
  • https://localhost:8081 → Cosmos DB Explorer
```

### Development (docker-compose.dev.yml)

```
┌──────────────────────────────────────────┐
│  Docker Network: iq-challenge-dev-network│
│                                           │
│  ┌────────────────┐                      │
│  │   cosmosdb     │                      │
│  │  Port: 8081    │                      │
│  └────────┬───────┘                      │
│           │                               │
│           ↓                               │
│  ┌────────────────┐                      │
│  │   api          │                      │
│  │  Port: 5000    │                      │
│  │  (Backend only)│                      │
│  └────────────────┘                      │
└──────────────────────────────────────────┘
         ↑
         │ HTTP requests
         │
┌────────┴──────────┐
│  Host Machine     │
│  Frontend         │
│  Port: 5173       │
│  (npm run dev)    │
└───────────────────┘

Services:
  • cosmosdb: Azure Cosmos DB Emulator
  • api:      Built from Dockerfile.dev (backend only, watch mode)

Frontend runs separately on host with Vite dev server

Access:
  • http://localhost:5173  → Frontend (Vite HMR)
  • http://localhost:5000  → API + Swagger
  • https://localhost:8081 → Cosmos DB Explorer
```

## Image Size Optimization

```
Build Stages:
┌──────────────────────────────────────┐
│ Stage 1: dotnet/sdk:10.0-alpine      │
│ Size: ~600 MB (build tools)          │
│ Purpose: Compile .NET application    │
│ Discarded: Yes ✓                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Stage 2: node:22-alpine              │
│ Size: ~200 MB (build tools)          │
│ Purpose: Build React frontend        │
│ Discarded: Yes ✓                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Stage 3: dotnet/aspnet:10.0-alpine   │
│ Size: ~110 MB (runtime only)         │
│ + Backend binaries: ~20 MB           │
│ + Frontend assets: ~5-10 MB          │
│ ─────────────────────────────────────│
│ Final Image: ~200-300 MB             │
│ Optimization: 80% reduction ✓        │
└──────────────────────────────────────┘
```

## Security Architecture

```
┌────────────────────────────────────────────────────────┐
│  Container Security                                     │
│                                                          │
│  ✓ Alpine Linux (minimal attack surface)               │
│  ✓ Non-root user (appuser:1000)                        │
│  ✓ No build tools in final image                       │
│  ✓ Health checks enabled                               │
│  ✓ Read-only root filesystem compatible                │
│  ✓ Minimal dependencies                                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Application Security                             │ │
│  │                                                    │ │
│  │  ✓ Rate limiting (100 req/min per IP)            │ │
│  │  ✓ CORS restrictions (production)                │ │
│  │  ✓ Input validation                              │ │
│  │  ✓ Request size limits (10 MB)                   │ │
│  │  ✓ Exception handling middleware                 │ │
│  │  ✓ Secure headers                                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Data Security                                    │ │
│  │                                                    │ │
│  │  ✓ Secrets via environment variables             │ │
│  │  ✓ Cosmos DB SSL/TLS                             │ │
│  │  ✓ Connection string encryption                  │ │
│  │  ✓ Azure Key Vault integration ready             │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Deployment Targets

```
                    ┌─────────────────────┐
                    │  Docker Image       │
                    │  (iq-challenge)     │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ↓                   ↓                   ↓
┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Azure Container  │  │ Azure App        │  │ Azure          │
│ Apps             │  │ Service          │  │ Kubernetes     │
│                  │  │ (Container)      │  │ Service (AKS)  │
│ • Auto-scale     │  │                  │  │                │
│ • Serverless     │  │ • Full control   │  │ • K8s native   │
│ • HTTPS auto     │  │ • Custom domain  │  │ • Helm charts  │
│ • Regional       │  │ • Slots          │  │ • Advanced     │
│                  │  │ • Easy config    │  │   networking   │
└──────────────────┘  └──────────────────┘  └────────────────┘

All targets support:
  ✓ Environment variables
  ✓ Managed identity
  ✓ Azure Monitor integration
  ✓ Horizontal scaling
  ✓ Health check probes
```

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (.github/workflows/docker-build.yml)        │
└─────────────────────────────────────────────────────────────┘
                        │
                        ↓
              ┌─────────────────┐
              │  Checkout Code  │
              └────────┬────────┘
                       ↓
           ┌───────────────────────┐
           │  Docker Buildx Setup  │
           └───────────┬───────────┘
                       ↓
          ┌────────────────────────┐
          │  Multi-arch Build      │
          │  • linux/amd64         │
          │  • linux/arm64         │
          └───────────┬────────────┘
                      ↓
         ┌────────────────────────────┐
         │  Push to GHCR              │
         │  ghcr.io/microsoft/        │
         │    iq-challenge:latest     │
         │    iq-challenge:v1.0.0     │
         │    iq-challenge:sha-abc123 │
         └────────────┬───────────────┘
                      ↓
      ┌───────────────────────────────┐
      │  Generate Attestation         │
      │  (Provenance + SBOM)          │
      └───────────────┬───────────────┘
                      ↓
           ┌──────────────────┐
           │  Ready to Deploy │
           └──────────────────┘
```
