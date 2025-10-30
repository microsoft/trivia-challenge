# Infrastructure Deployment

This directory contains the Bicep infrastructure-as-code templates for the IQ Challenge application.

## Overview

The infrastructure includes:
- **Azure Container Registry (ACR)**: For storing Docker container images
- **Azure App Service Plan**: Linux-based plan for hosting containers
- **Azure App Service**: Web app configured to run Docker containers
- **Azure Cosmos DB** (optional): Serverless database for storing application data

All resources are deployed using **Azure Verified Modules (AVM)** for best practices and compliance.

## Configuration Management

Infrastructure configuration is managed through YAML files and Bicep parameter files:

### Available Configurations

1. **`config.dev.yaml`** + **`main.dev.bicepparam`**: Development without Cosmos DB
2. **`config.devdb.yaml`** + **`main.devdb.bicepparam`**: Development with Cosmos DB
3. **`config.prod.yaml`** + **`main.prod.bicepparam`**: Production without Cosmos DB

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Appropriate Azure subscription permissions
- Resource group created

## Quick Start

### 1. Create Resource Group

```bash
az group create \
  --name rg-iqchallenge-bicep \
  --location eastus
```

### 2. Deploy Infrastructure

**Option A: Development without Cosmos DB**
```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.dev.bicepparam
```

**Option B: Development with Cosmos DB**
```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.devdb.bicepparam
```

**Option C: Production (no Cosmos DB)**
```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.prod.bicepparam
```

### 3. Deploy with Custom Parameters

```bash
az deployment group create \
  --resource-group rg-iqchallenge-bicep \
  --template-file infra/main.bicep \
  --parameters namePrefix=myapp \
               environment=prod \
               containerImage=myacr.azurecr.io/myapp:latest \
               acrSku=Premium \
               appServicePlanSkuName=P2v2 \
               appServicePlanSkuTier=PremiumV2 \
               deployCosmosDb=false
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `namePrefix` | string | (required) | Prefix for all resource names |
| `location` | string | Resource Group location | Azure region for resources |
| `containerImage` | string | (required) | Docker image to deploy (e.g., `mcr.microsoft.com/dotnet/samples:aspnetapp`) |
| `environment` | string | `dev` | Environment name (dev, staging, prod) |
| `acrSku` | string | `Basic` | Container Registry SKU (Basic, Standard, Premium) |
| `appServicePlanSkuName` | string | `B1` | App Service Plan SKU name (B1, B2, B3, S1, S2, S3, P1v2, P2v2, P3v2) |
| `appServicePlanSkuTier` | string | `Basic` | App Service Plan SKU tier (Basic, Standard, PremiumV2) |
| `deployCosmosDb` | bool | `false` | Whether to deploy Cosmos DB serverless instance |
| `cosmosDbDatabaseName` | string | `iqchallenge` | Name of the Cosmos DB database |
| `cosmosDbContainers` | array | See below | Array of containers with partition key paths |

## Default Cosmos DB Containers

When `deployCosmosDb=true`, the following containers are created:

| Container | Partition Key | Purpose |
|-----------|---------------|---------|
| `users` | `/id` | User profiles and authentication |
| `sessions` | `/userId` | Game sessions per user |
| `questions` | `/id` | Question bank |
| `telemetry` | `/sessionId` | User interaction telemetry |

## Outputs

After deployment, the following outputs are available:

- `acrName`: Container Registry name
- `acrLoginServer`: ACR login server URL
- `appServiceName`: App Service name
- `appServiceHostname`: App Service default hostname
- `appServicePrincipalId`: Managed identity principal ID
- `cosmosDbAccountName`: Cosmos DB account name (if deployed)
- `cosmosDbEndpoint`: Cosmos DB endpoint URL (if deployed)
- `cosmosDbDeployed`: Boolean indicating if Cosmos DB was deployed

## Deployment Validation

Preview changes before deployment:

**Using parameter files:**
```bash
# Dev without DB
az deployment group what-if \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.dev.bicepparam

# Dev with DB
az deployment group what-if \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.devdb.bicepparam

# Production
az deployment group what-if \
  --resource-group rg-iqchallenge-bicep \
  --parameters infra/main.prod.bicepparam
```

**Using inline parameters:**
```bash
az deployment group what-if \
  --resource-group rg-iqchallenge-bicep \
  --template-file infra/main.bicep \
  --parameters namePrefix=demo containerImage=repo/demo:latest deployCosmosDb=true
```

## Azure Verified Modules Used

- **Container Registry**: `br/public:avm/res/container-registry/registry:0.1.1`
- **App Service Plan**: `br/public:avm/res/web/serverfarm:0.1.0`
- **App Service**: `br/public:avm/res/web/site:0.3.9`
- **Cosmos DB**: `br/public:avm/res/document-db/database-account:0.8.1` (optional)

## Environment-Specific Configurations

### Development (no database)
Use `main.dev.bicepparam`:
- ACR: Basic
- App Service: B1
- Cosmos DB: Not deployed

### Development (with database)
Use `main.devdb.bicepparam`:
- ACR: Basic
- App Service: B1
- Cosmos DB: Serverless (deployed)

### Production
Use `main.prod.bicepparam`:
- ACR: Premium
- App Service: P2v2
- Cosmos DB: Not deployed (assumes external database)

### Custom Configuration
Edit YAML files or create new ones:
```yaml
namePrefix: myapp
environment: staging
deployCosmosDb: true
acrSku: Standard
appServicePlanSkuName: S2
appServicePlanSkuTier: Standard
containerImage: myregistry.azurecr.io/myapp:latest
```

## Managed Identity & Secure Access

The App Service is configured with a system-assigned managed identity. This identity is automatically granted:
- **AcrPull role** on the Container Registry (for pulling container images)
- Access to other Azure services securely (Cosmos DB, Key Vault, etc.)

### Container Registry Authentication

The infrastructure is configured to use **managed identity authentication** for ACR:
- ✅ ACR admin user is **disabled** for security
- ✅ `acrUseManagedIdentityCreds` is set to `true` on App Service
- ✅ AcrPull role assignment is automatically created
- ✅ No credentials stored in app settings

This means the App Service can pull images from ACR securely without storing any credentials.

### Cosmos DB Authentication

When Cosmos DB is deployed (`deployCosmosDb=true`):
- ✅ **System-assigned managed identity** is enabled on Cosmos DB
- ✅ **Cosmos DB Data Contributor role** is automatically assigned to App Service identity
- ✅ Environment variables are automatically configured:
  - `CosmosDb__AccountEndpoint`: Cosmos DB endpoint URL
  - `CosmosDb__DatabaseName`: Database name (default: `iqchallenge`)
  - `CosmosDb__UseIdentity`: Set to `true` to use managed identity

**No manual role assignment needed!** The infrastructure automatically:
1. Enables system-assigned managed identity on Cosmos DB
2. Grants the App Service managed identity **Cosmos DB Built-in Data Contributor** role (`00000000-0000-0000-0000-000000000002`)
3. Configures App Service to use managed identity for Cosmos DB access

## Next Steps

1. **Push Docker Image to ACR**:
   ```bash
   az acr login --name <acrName>
   docker tag myapp:latest <acrLoginServer>/myapp:latest
   docker push <acrLoginServer>/myapp:latest
   ```

2. **Update App Service Configuration**:
   ```bash
   az webapp config container set \
     --name <appServiceName> \
     --resource-group rg-iqchallenge-bicep \
     --docker-custom-image-name <acrLoginServer>/myapp:latest
   ```

3. **Configure ACR Integration**:
   ```bash
   az webapp config container set \
     --name <appServiceName> \
     --resource-group rg-iqchallenge-bicep \
     --docker-registry-server-url https://<acrLoginServer> \
     --docker-registry-server-user <acrName> \
     --docker-registry-server-password $(az acr credential show --name <acrName> --query passwords[0].value -o tsv)
   ```

## Troubleshooting

### View Deployment Errors
```bash
az deployment group show \
  --resource-group rg-iqchallenge-bicep \
  --name <deployment-name> \
  --query properties.error
```

### Check App Service Logs
```bash
az webapp log tail \
  --name <appServiceName> \
  --resource-group rg-iqchallenge-bicep
```

### Validate Bicep Syntax
```bash
az bicep build --file infra/main.bicep
```

## Clean Up

To delete all resources:

```bash
az group delete --name rg-iqchallenge-bicep --yes --no-wait
```
