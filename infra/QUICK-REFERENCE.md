# Infrastructure Quick Reference

## File Structure

```
infra/
├── main.bicep                    # Main infrastructure template
├── main.dev.bicepparam          # Dev config (no DB) loader
├── main.devdb.bicepparam        # Dev config (with DB) loader
├── main.prod.bicepparam         # Prod config (no DB) loader
├── config.dev.yaml              # Dev configuration
├── config.devdb.yaml            # Dev with DB configuration
├── config.prod.yaml             # Production configuration
├── main.parameters.json         # Legacy parameters file
└── README.md                    # Full documentation
```

## Quick Commands

### Deploy Development (No Database)
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.dev.bicepparam
```

### Deploy Development (With Database)
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.devdb.bicepparam
```

### Deploy Production
```bash
az deployment group create \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.prod.bicepparam
```

### Preview Changes (What-If)
```bash
az deployment group what-if \
  --resource-group rg-triviachallenge-bicep \
  --parameters infra/main.devdb.bicepparam
```

## Resources Deployed

### Always Deployed
- ✅ Azure Container Registry (ACR)
- ✅ App Service Plan (Linux)
- ✅ App Service (Container-based)

### Conditionally Deployed
- ⚡ Cosmos DB Serverless (when `deployCosmosDb: true`)
  - Database: `triviachallenge`
  - Containers: `users`, `sessions`, `questions`, `telemetry`

## Configuration Examples

### YAML Configuration File
```yaml
namePrefix: triviachallenge
environment: dev
deployCosmosDb: true
acrSku: Basic
appServicePlanSkuName: B1
appServicePlanSkuTier: Basic
containerImage: mcr.microsoft.com/dotnet/samples:aspnetapp
```

### Bicep Parameter File
```bicep
using './main.bicep'

var config = loadYamlContent('config.dev.yaml')

param namePrefix = config.namePrefix
param environment = config.environment
param deployCosmosDb = config.deployCosmosDb
// ... more parameters
```

## Key Features

### 🔒 Security
- HTTPS enforced on App Service
- TLS 1.2 minimum
- Managed identity for service-to-service authentication
- ACR admin user **disabled** - using managed identity for authentication
- AcrPull role automatically assigned to App Service identity

### ⚡ Performance
- Serverless Cosmos DB (pay-per-use)
- Configurable App Service tiers
- Zone-redundancy options

### 📊 Observability
- Tags on all resources (environment, project, managedBy)
- Diagnostic settings ready to be configured
- Output values for easy integration

## Common Tasks

### Get Deployment Outputs
```bash
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs
```

### Get ACR Login Server
```bash
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs.acrLoginServer.value -o tsv
```

### Get App Service URL
```bash
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs.appServiceHostname.value -o tsv
```

### Get Cosmos DB Endpoint
```bash
az deployment group show \
  -g rg-triviachallenge-bicep \
  -n <deployment-name> \
  --query properties.outputs.cosmosDbEndpoint.value -o tsv
```

## Troubleshooting

### Deployment Fails
1. Check validation:
   ```bash
   az bicep build --file infra/main.bicep
   ```

2. Run what-if analysis:
   ```bash
   az deployment group what-if \
    --resource-group rg-triviachallenge-bicep \
     --parameters infra/main.dev.bicepparam
   ```

3. Check deployment errors:
   ```bash
   az deployment group show \
    -g rg-triviachallenge-bicep \
     -n <deployment-name> \
     --query properties.error
   ```

### App Service Not Starting
1. Check logs:
   ```bash
   az webapp log tail \
     --name <appServiceName> \
    --resource-group rg-triviachallenge-bicep
   ```

2. Verify container image:
   ```bash
   az webapp config container show \
     --name <appServiceName> \
    --resource-group rg-triviachallenge-bicep
   ```

### Cosmos DB Access Issues
1. Verify endpoint configuration:
   ```bash
   az webapp config appsettings list \
     --name <appServiceName> \
    --resource-group rg-triviachallenge-bicep \
     --query "[?name=='CosmosDb__AccountEndpoint']"
   ```

2. Check managed identity role assignment:
   ```bash
   az cosmosdb sql role assignment list \
     --account-name <cosmosDbAccountName> \
    --resource-group rg-triviachallenge-bicep
   ```

## Cost Optimization

### Development
- Use Basic SKUs (ACR: Basic, App Service: B1)
- Deploy Cosmos DB only when needed (`deployCosmosDb: false`)
- Stop App Service when not in use

### Production
- Use Premium SKUs for better performance
- Consider reserved capacity for predictable workloads
- Enable autoscaling for App Service

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Build and push container image to ACR
3. ✅ Configure Cosmos DB role assignments (if using managed identity)
4. ✅ Update App Service with your container image
5. ✅ Configure custom domain and SSL (if needed)
6. ✅ Set up monitoring and alerts

## Support

For detailed documentation, see [README.md](README.md)
