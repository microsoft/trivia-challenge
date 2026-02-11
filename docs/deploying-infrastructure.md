# Deploying Infrastructure

This guide explains how to deploy the Azure infrastructure for the Microsoft Fabric Trivia Challenge using Bicep templates and Azure Verified Modules.

## What gets deployed

| Resource | Purpose |
|----------|---------|
| Azure Container Registry (ACR) | Stores Docker container images |
| Azure App Service Plan | Linux-based hosting plan |
| Azure App Service | Web app configured to run containers |
| Azure Cosmos DB *(optional)* | Serverless database for application data |

All resources are deployed using [Azure Verified Modules (AVM)](https://azure.github.io/Azure-Verified-Modules/) for best practices and compliance.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed and logged in (`az login`)
- An Azure subscription with permissions to create resources
- A resource group (the commands below create one for you)

## Deployment flavors

The `infra/` directory ships three pre-configured flavors:

| Flavor | Parameter file | Cosmos DB | App Service SKU | Typical use |
|--------|---------------|-----------|-----------------|-------------|
| **Dev (no DB)** | `main.dev.bicepparam` | ❌ Not deployed | B1 (Basic) | Quick dev/test without a cloud database (use the local emulator) |
| **Dev with DB** | `main.devdb.bicepparam` | ✅ Serverless | B1 (Basic) | Dev/test with a cloud Cosmos DB instance |
| **Production** | `main.prod.bicepparam` | ❌ Not deployed | P2v2 (Premium) | Production workloads (assumes an external database, e.g. Cosmos DB on Fabric) |

Each parameter file loads its settings from a corresponding YAML config file (`config.dev.yaml`, `config.devdb.yaml`, `config.prod.yaml`).

### Using Cosmos DB on Microsoft Fabric

For the "Cosmos DB on Fabric" scenario, deploy using the **Production** flavor (or the **Dev no-DB** flavor) and point the application at a [mirrored Cosmos DB database in Microsoft Fabric](https://learn.microsoft.com/fabric/database/mirrored-database/azure-cosmos-db). In this case the Cosmos DB account is provisioned and managed through Fabric rather than via these Bicep templates. You only need to configure the connection string in the App Service environment variables after deployment (see step 3 below).

---

## Step-by-step deployment

### 1. Create a resource group

```bash
az group create \
  --name rg-triviachallenge-bicep \
  --location eastus
```

### 2. Deploy infrastructure

Pick the flavor that matches your scenario:

**Dev without Cosmos DB:**
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.dev.bicepparam
```

**Dev with Cosmos DB:**
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.devdb.bicepparam
```

**Production (no Cosmos DB — use external DB or Fabric):**
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.prod.bicepparam
```

### 3. Configure Cosmos DB connection (when using an external database)

If you deployed without Cosmos DB (dev-no-DB or production flavor) and need to connect to an existing Cosmos DB account (Azure or Fabric-mirrored), set the App Service environment variables:

```bash
az webapp config appsettings set \
  --name <appServiceName> \
  --resource-group rg-triviachallenge-bicep \
  --settings \
    CosmosDb__AccountEndpoint="https://<your-account>.documents.azure.com:443/" \
    CosmosDb__DatabaseName="triviachallenge"
```

When the `devdb` flavor is used, the Bicep template automatically configures the App Service with the correct Cosmos DB endpoint and managed-identity role assignment — no manual configuration is needed.

---

## Previewing changes (what-if)

Before deploying, preview which resources will be created, updated, or deleted:

```bash
az deployment group what-if \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.devdb.bicepparam
```

## Custom parameters

You can deploy with fully custom parameters instead of using the pre-built parameter files:

```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --template-file infra/main.bicep \
  --parameters \
    namePrefix=myapp \
    environment=staging \
    containerImage=myacr.azurecr.io/myapp:latest \
    acrSku=Standard \
    appServicePlanSkuName=S2 \
    appServicePlanSkuTier=Standard \
    deployCosmosDb=true
```

See [infra/README.md](../infra/README.md) for the full parameter reference.

## Security features

The Bicep templates configure security best-practices automatically:

- **HTTPS enforced** on the App Service
- **TLS 1.2** minimum
- **Managed identity** for service-to-service authentication (ACR pull, Cosmos DB data access)
- **ACR admin user disabled** — image pull uses managed identity
- **AcrPull role** automatically assigned to the App Service managed identity
- **Cosmos DB Data Contributor role** automatically assigned when `deployCosmosDb=true`

## Retrieve deployment outputs

After deployment, retrieve resource names and endpoints:

```bash
# All outputs
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs

# ACR login server
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs.acrLoginServer.value -o tsv

# App Service hostname
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs.appServiceHostname.value -o tsv
```

## Clean up

Delete all resources by removing the resource group:

```bash
az group delete --name rg-triviachallenge-bicep --yes --no-wait
```

## Next steps

- [Deploying Code](deploying-code.md) — build and push the application image
- [Development Setup](development-setup.md) — set up your local dev environment
