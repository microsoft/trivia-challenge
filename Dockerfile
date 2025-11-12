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
# Stage 3: Final Runtime Image
##################################################
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final

WORKDIR /app

# Install curl for healthchecks (optional but recommended)
RUN apk add --no-cache curl

# Copy backend published files
COPY --from=backend-build /app/publish .

# Copy frontend build output to wwwroot
COPY --from=frontend-build /app/dist ./wwwroot

# Create a non-root user
RUN addgroup -g 1000 appuser && \
    adduser -u 1000 -G appuser -s /bin/sh -D appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "IQChallenge.Api.dll"]
