# Infrastructure Deployment Summary

## Overview

Successfully created Azure infrastructure using **Azure Verified Modules (AVM)** for:
1. **Azure Container Registry (ACR)** - For Docker image storage
2. **Azure App Service Plan** - Linux-based hosting plan
3. **Azure App Service** - Container-based web application

## Files Created

### `/workspaces/iq-challenge/infra/main.bicep`
Main Bicep template using Azure Verified Modules:
- `br/public:avm/res/container-registry/registry:0.1.1` - Container Registry
- `br/public:avm/res/web/serverfarm:0.1.0` - App Service Plan
- `br/public:avm/res/web/site:0.3.9` - App Service (Web App)

### `/workspaces/iq-challenge/infra/main.parameters.json`
Default parameters file for easy deployment with sensible defaults.

### `/workspaces/iq-challenge/infra/README.md`
Comprehensive documentation including:
- Deployment instructions
- Parameter descriptions
- Environment-specific configurations
- Troubleshooting guide
- Next steps for container deployment

## Resources to be Created

Based on the what-if analysis:

1. **Container Registry**: `iqchallengeacr{uniquestring}`
   - SKU: Basic
   - Admin user enabled for easy access
   - Public network access enabled
   - Soft delete policy (7 days retention)

2. **App Service Plan**: `iqchallenge-asp-dev`
   - SKU: B1 (Basic tier)
   - OS: Linux
   - Reserved for Linux containers

3. **App Service**: `iqchallenge-api-dev`
   - Type: Linux container app
   - HTTPS only
   - System-assigned managed identity
   - Container configuration with ACR integration
   - Custom port mapping (8080)

## Key Features

### Security
- ✅ HTTPS enforced
- ✅ Managed identity for secure ACR access
- ✅ TLS 1.2 minimum
- ✅ FTPS disabled
- ✅ No client affinity (stateless)

### Container Integration
- ✅ ACR credentials automatically configured
- ✅ Docker registry server URL configured
- ✅ Container port (8080) mapped
- ✅ App Service storage disabled for containers

### Scalability
- ✅ Environment-based naming (dev/staging/prod)
- ✅ Unique resource naming with suffix
- ✅ Configurable SKUs per environment
- ✅ Tags for resource management

## Deployment Commands

### Basic Deployment
```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

### Custom Deployment
```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --template-file infra/main.bicep \
  --parameters namePrefix=iqchallenge \
               containerImage=mcr.microsoft.com/dotnet/samples:aspnetapp \
               environment=dev
```

## Next Steps

1. **Deploy the infrastructure**:
   ```bash
   az deployment group create \
     --resource-group rg-iqchallenge-bicep \
     --template-file infra/main.bicep \
     --parameters infra/main.parameters.json
   ```

2. **Build and push your Docker image**:
   ```bash
   # Login to ACR
   az acr login --name $(az deployment group show -g rg-iqchallenge-bicep -n <deployment-name> --query properties.outputs.acrName.value -o tsv)
   
   # Build and push
   docker build -t iqchallenge-api:latest .
   docker tag iqchallenge-api:latest <acrLoginServer>/iqchallenge-api:latest
   docker push <acrLoginServer>/iqchallenge-api:latest
   ```

3. **Update App Service to use your image**:
   ```bash
   az webapp config container set \
     --name iqchallenge-api-dev \
     --resource-group rg-iqchallenge-bicep \
     --docker-custom-image-name <acrLoginServer>/iqchallenge-api:latest
   ```

## Environment Variables

The following environment variables are pre-configured in App Service:
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE=false`
- `DOCKER_REGISTRY_SERVER_URL=https://<acrLoginServer>`
- `DOCKER_REGISTRY_SERVER_USERNAME=<acrName>`
- `WEBSITES_PORT=8080`

Add additional environment variables as needed for your application (e.g., Cosmos DB connection strings, API keys, etc.).

## Validation

The template has been validated using:
```bash
az bicep build --file infra/main.bicep  # ✅ Success
az deployment group what-if ...         # ✅ Success (3 resources to create)
```

## Azure Verified Modules Benefits

Using Azure Verified Modules provides:
- ✅ **Best Practices**: Microsoft-recommended configurations
- ✅ **Security**: Built-in security controls and compliance
- ✅ **Consistency**: Standardized resource deployment
- ✅ **Maintenance**: Microsoft-maintained and updated
- ✅ **Documentation**: Comprehensive parameter documentation
- ✅ **Testing**: Pre-tested and validated configurations
