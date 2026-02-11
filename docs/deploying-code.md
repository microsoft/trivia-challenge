# Deploying Code

This guide explains how to build, push, and deploy the Microsoft Fabric Trivia Challenge application to Azure after the [infrastructure has been provisioned](deploying-infrastructure.md).

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) installed and running
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed and logged in (`az login`)
- Azure Container Registry (ACR) and App Service deployed (see [Deploying Infrastructure](deploying-infrastructure.md))
- `AcrPush` (or `Contributor`) role on the ACR for your user account

## How it works

The `deploy-image.sh` script automates the entire process:

1. Validates prerequisites (Docker, Azure CLI, Azure login)
2. Verifies your ACR access and authenticates Docker
3. Builds a multi-stage Docker image (backend + frontend combined)
4. Tags the image with the git commit SHA and any additional tag you specify
5. Pushes the image to ACR
6. Updates the App Service container configuration and restarts it

## Quick start

```bash
# Basic deployment — discovers App Service name automatically
./deploy-image.sh <acr-name>

# Example
./deploy-image.sh triviachallengeacr123
```

The script tags every image with `latest` and the current short git SHA. You can add an additional version tag:

```bash
./deploy-image.sh triviachallengeacr123 --image-tag v1.0.0
```

## Full usage

```
./deploy-image.sh <acr-name> [options]

Arguments:
  acr-name                    Name of the Azure Container Registry (required)

Options:
  -g, --resource-group NAME   Resource group name (default: rg-triviachallenge-bicep)
  -a, --app-name NAME         App Service name (auto-discovered if omitted)
  -t, --image-tag TAG         Additional image tag (default: latest)
  --no-cache                  Build without Docker cache
  --station-lockdown          Enable station lockdown build mode
  -h, --help                  Show help message
```

## Examples

### Deploy to the default resource group

```bash
./deploy-image.sh triviachallengeacr123
```

### Deploy to a specific environment

```bash
# Development
./deploy-image.sh myacr -g rg-triviachallenge-dev -a myapp-api-dev -t dev-latest

# Staging
./deploy-image.sh myacr -g rg-triviachallenge-staging -a myapp-api-staging

# Production with version tag
./deploy-image.sh myacr -g rg-triviachallenge-prod -a myapp-api-prod -t v1.0.0
```

### Force a clean rebuild

```bash
./deploy-image.sh triviachallengeacr123 --no-cache
```

### Build for kiosk/station mode

When deploying for an event where each kiosk requires a `stationId`, enable station lockdown:

```bash
./deploy-image.sh triviachallengeacr123 --station-lockdown
```

See [Station ID Tracking](STATION_ID_TRACKING.md) for details.

## Finding your ACR and App Service names

```bash
# List ACRs in the resource group
az acr list --resource-group rg-triviachallenge-bicep \
  --query "[].{Name:name, LoginServer:loginServer}" -o table

# List App Services in the resource group
az webapp list --resource-group rg-triviachallenge-bicep \
  --query "[].name" -o table
```

## Monitoring a deployment

```bash
# Stream live logs
az webapp log tail --name <app-name> --resource-group <resource-group>

# Check app status
az webapp show --name <app-name> --resource-group <resource-group> --query state -o tsv

# View current container settings
az webapp config container show --name <app-name> --resource-group <resource-group>
```

## CI/CD integration

### GitHub Actions

```yaml
- name: Deploy to Azure
  run: |
    ./deploy-image.sh ${{ secrets.ACR_NAME }} \
      -g ${{ secrets.RESOURCE_GROUP }} \
      -a ${{ secrets.APP_NAME }} \
      -t ${{ github.sha }}
```

### Azure DevOps Pipelines

```yaml
- script: |
    ./deploy-image.sh $(ACR_NAME) \
      -g $(RESOURCE_GROUP) \
      -a $(APP_NAME) \
      -t $(Build.BuildId)
  displayName: 'Deploy Docker Image'
```

## Docker image architecture

The `Dockerfile` uses a multi-stage build:

```
Stage 1: dotnet/sdk:10.0-alpine
  → Restore NuGet packages, build & publish the .NET API

Stage 2: node:22-alpine
  → Install npm dependencies, build the React app with Vite

Stage 3: dotnet/aspnet:10.0-alpine  (final image)
  → Copy published API from Stage 1
  → Copy frontend dist/ to wwwroot/
  → Run as non-root user on port 8080
```

The final image is ~200–300 MB and serves both the API and the frontend from a single container.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not logged into Azure" | Run `az login` |
| "Cannot access ACR" | Verify the ACR name and your role assignment (`AcrPush` or `Contributor`) |
| "Could not discover App Service" | Provide `--app-name` explicitly |
| Docker build fails | Try `--no-cache`; check that Docker Desktop is running |
| Image pushed but app not updating | Manually restart: `az webapp restart --name <app> --resource-group <rg>` |

## Next steps

- [Development Setup](development-setup.md) — set up your local dev environment
- [Deploying Infrastructure](deploying-infrastructure.md) — provision Azure resources
- [Telemetry Events Reference](telemetry-events.md) — understand the analytics events
