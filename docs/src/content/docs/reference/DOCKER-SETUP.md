# Docker Setup Summary

## What Was Created

This Docker setup enables the IQ Challenge application to run in production with the frontend served by the backend API.

### Files Created

1. **`Dockerfile`** - Multi-stage production build
   - Stage 1: Build .NET backend with Alpine Linux
   - Stage 2: Build React frontend with Node.js
   - Stage 3: Final image combining backend + frontend static files
   - Uses Alpine Linux for minimal image size (~200-300 MB)
   - Runs as non-root user for security
   - Includes health checks

2. **`Dockerfile.dev`** - Development-only backend build
   - For running backend API with watch mode
   - Frontend runs separately with Vite dev server

3. **`docker-compose.yml`** - Production setup
   - Full app (backend serving frontend) + Cosmos DB Emulator
   - Port 8080 for application
   - Port 8081 for Cosmos DB Emulator

4. **`docker-compose.dev.yml`** - Development setup
   - Backend API only + Cosmos DB Emulator
   - Port 5000 for backend API
   - Frontend runs separately on port 5173

5. **`.dockerignore`** - Optimizes Docker build
   - Excludes node_modules, bin, obj, test files
   - Reduces build context size significantly

6. **`docker.sh`** - Helper script for common operations
   - Easy commands: `prod:up`, `dev:up`, `dev:frontend`, `clean`, etc.
   - Provides helpful output and instructions
   - Made executable with proper permissions

7. **`DOCKER.md`** - Comprehensive documentation
   - Architecture diagrams
   - Usage instructions
   - Troubleshooting guide
   - Azure deployment examples

8. **`.github/workflows/docker-build.yml`** - CI/CD pipeline
   - Builds and pushes to GitHub Container Registry
   - Multi-platform support (amd64, arm64)
   - Automated on push to main/develop

### Backend Changes

**`backend/IQChallenge.Api/Program.cs`** - Updated to serve static files in production:

```csharp
// Added after Swagger configuration
else
{
    // In production, serve static files from wwwroot
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// At the end, before app.Run()
else
{
    // SPA fallback - serve index.html for all non-API routes
    app.MapFallbackToFile("index.html");
}
```

**Key behaviors:**
- **Development mode**: Only serves API endpoints, Swagger UI enabled, CORS allows all origins
- **Production mode**: Serves static files from wwwroot/, SPA fallback routing, CORS restricted

## How It Works

### Production Mode Flow

1. **Build Process:**
   ```
   Frontend (React) → Vite Build → dist/
   Backend (.NET) → dotnet publish → publish/
   
   Final Container:
   /app/
   ├── IQChallenge.Api.dll    (backend)
   ├── wwwroot/               (frontend)
   │   ├── index.html
   │   ├── assets/
   │   └── ...
   ```

2. **Runtime:**
   - Container starts on port 8080
   - ASP.NET Core serves static files from wwwroot/
   - API endpoints at `/api/v1.0/*`
   - All other routes → `index.html` (SPA routing)

3. **Request Flow:**
   ```
   GET /                 → index.html
   GET /assets/main.js   → wwwroot/assets/main.js
   POST /api/v1.0/users  → Backend API
   GET /play             → index.html (React Router handles)
   ```

### Development Mode Flow

1. **Backend in Docker:**
   - Runs on port 5000
   - Watch mode enabled (auto-reload)
   - Swagger UI at /swagger
   - Connects to Cosmos DB Emulator

2. **Frontend Separately:**
   - Runs with `npm run dev` (Vite)
   - Hot module replacement enabled
   - Port 5173
   - Proxies API calls to localhost:5000

## Usage Examples

### Quick Start (Production)
```bash
./docker.sh prod:up
# Access at http://localhost:8080
```

### Development Workflow
```bash
# Terminal 1: Start backend + database
./docker.sh dev:up

# Terminal 2: Start frontend
./docker.sh dev:frontend
```

### Build for Deployment
```bash
# Build production image
docker build -t iq-challenge:latest .

# Run with Azure Cosmos DB
docker run -p 8080:8080 \
  -e CosmosDb__EndpointUri="https://your-account.documents.azure.com:443/" \
  -e CosmosDb__PrimaryKey="your-key" \
  iq-challenge:latest
```

### CI/CD
GitHub Actions automatically builds and pushes to `ghcr.io/microsoft/iq-challenge:latest` on push to main.

## Benefits

### For Development
- ✅ Quick setup with `./docker.sh dev:up`
- ✅ Hot reload for both frontend and backend
- ✅ Isolated environment (no local .NET/Node conflicts)
- ✅ Same database setup for all developers

### For Production
- ✅ Single container deployment
- ✅ Minimal image size (Alpine Linux)
- ✅ Secure (non-root user, minimal dependencies)
- ✅ Scalable (stateless, can run multiple instances)
- ✅ Health checks built-in
- ✅ Ready for Azure Container Apps, App Service, AKS

### For Operations
- ✅ Consistent across environments
- ✅ Easy rollback (tagged images)
- ✅ Simple configuration (environment variables)
- ✅ Built-in observability (health endpoints)

## Testing the Setup

### Test Production Build
```bash
# Build and start
./docker.sh prod:up

# Test frontend
curl http://localhost:8080/
# Should return HTML with React app

# Test API
curl http://localhost:8080/api/v1.0/users/test@example.com
# Should return user data or 404

# Check health
curl http://localhost:8080/health
# Should return healthy status

# View logs
./docker.sh prod:logs
```

### Test Development Build
```bash
# Start dev environment
./docker.sh dev:up

# In another terminal, start frontend
./docker.sh dev:frontend

# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost:5173/
# Should see Vite dev server response

# Both should be accessible
```

## Troubleshooting

### Frontend not loading in production
```bash
# Check if files are in container
docker exec -it iq-challenge-app ls -la /app/wwwroot

# Check environment
docker exec -it iq-challenge-app env | grep ASPNETCORE_ENVIRONMENT
# Should be "Production"

# Check logs
docker logs iq-challenge-app
```

### API not responding
```bash
# Check if container is running
docker ps | grep iq-challenge

# Check health
curl http://localhost:8080/health

# View detailed logs
docker logs -f iq-challenge-app
```

### Cosmos DB connection issues
```bash
# Check if Cosmos DB is running
docker ps | grep cosmos

# Check connection string
docker exec -it iq-challenge-app env | grep CosmosDb

# Check API logs for connection errors
docker logs iq-challenge-app | grep -i cosmos
```

## Next Steps

1. **Configure Azure deployment**
   - Set up Azure Container Registry
   - Deploy to Azure Container Apps or App Service
   - Configure production Cosmos DB connection

2. **Set up monitoring**
   - Application Insights integration
   - Log aggregation
   - Performance monitoring

3. **Implement secrets management**
   - Azure Key Vault for connection strings
   - Managed identities
   - Remove hardcoded emulator keys

4. **Enhance CI/CD**
   - Add automated tests before build
   - Implement staging environment
   - Blue-green deployment strategy

5. **Optimize performance**
   - Implement caching
   - CDN for static assets
   - Connection pooling optimization
