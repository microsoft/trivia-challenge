##################################################
# Stage 1: Build Backend
##################################################
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS backend-build

WORKDIR /src

# Copy solution and project files (exclude tests)
COPY backend/IQChallenge.Api/IQChallenge.Api.csproj ./backend/IQChallenge.Api/

# Restore dependencies
RUN dotnet restore backend/IQChallenge.Api/IQChallenge.Api.csproj

# Copy only the API project source code (exclude tests)
COPY backend/IQChallenge.Api/ ./backend/IQChallenge.Api/

# Build and publish the API
WORKDIR /src/backend/IQChallenge.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

##################################################
# Stage 2: Build Frontend
##################################################
FROM node:22-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy frontend source
COPY frontend/ ./

# Build the frontend for production
RUN npm run build

##################################################
# Stage 3: Build Health Probe (for container health checks)
##################################################
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS healthcheck-build

WORKDIR /src/healthcheck

RUN dotnet new console --framework net10.0
RUN rm Program.cs
RUN printf "using System;\nusing System.Net.Http;\n\nvar client = new HttpClient\n{\n    Timeout = TimeSpan.FromSeconds(2)\n};\n\ntry\n{\n    using var response = await client.GetAsync(\"http://127.0.0.1:8080/health\");\n    Environment.Exit(response.IsSuccessStatusCode ? 0 : 1);\n}\ncatch\n{\n    Environment.Exit(1);\n}\n" > Program.cs
RUN dotnet publish -c Release -o /out

##################################################
# Stage 4: Final Runtime Image (Chiseled)
##################################################
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled AS final

WORKDIR /app

# Copy backend published files and assets with non-root ownership
COPY --from=backend-build --chown=app:app /app/publish .
COPY --from=frontend-build --chown=app:app /app/dist ./wwwroot
COPY --from=healthcheck-build --chown=app:app /out ./healthcheck

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check using lightweight probe binary (no shell available in chiseled image)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["dotnet", "/app/healthcheck/healthcheck.dll"]

ENTRYPOINT ["dotnet", "IQChallenge.Api.dll"]
