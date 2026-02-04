# Docker Image Deployment Script

This script automates the process of building, pushing, and deploying the Trivia Challenge application to Azure.

## Quick Start

```bash
# Basic usage (discovers app service automatically)
./deploy-image.sh myacrname

# With custom resource group
./deploy-image.sh myacrname -g my-resource-group

# With specific app service name
./deploy-image.sh myacrname -a my-webapp-name

# With custom tag
./deploy-image.sh myacrname -t v1.0.0

# Build without cache
./deploy-image.sh myacrname --no-cache
```

## What It Does

The `deploy-image.sh` script performs these steps with comprehensive validation:

1. **✓ Validates prerequisites** - Checks Docker, Azure CLI, and Azure login
2. **✓ Verifies ACR access** - Ensures you have permissions and logs into ACR
3. **✓ Builds the Docker image** - Multi-stage build with optional cache control
4. **✓ Pushes to ACR** - Uploads image with error handling
5. **✓ Updates Web App** - Configures container image and restarts app

Each step includes detailed error messages and recovery instructions if something goes wrong.

## Prerequisites

Before running the script, ensure you have:

- ✅ Docker installed and running
- ✅ Azure CLI installed
- ✅ Logged into Azure (`az login`)
- ✅ Proper ACR permissions (AcrPush or Contributor role)
- ✅ Azure Container Registry deployed
- ✅ Azure Web App deployed (created via Bicep templates)

The script will automatically:
- ✅ Check all prerequisites and provide helpful error messages
- ✅ Verify ACR access and permissions
- ✅ Login to ACR for Docker push operations

## Usage

```
./deploy-image.sh <acr-name> [options]

Arguments:
  acr-name              Name of the Azure Container Registry (required)

Options:
  --resource-group, -g  Resource group name (default: rg-triviachallenge-bicep)
  --app-name, -a        App Service name (if not provided, will be discovered)
  --image-tag, -t       Image tag (default: latest)
  --no-cache            Build without Docker cache
  --help, -h            Show this help message
```

## Examples

### Deploy to default resource group
```bash
./deploy-image.sh demotriviachallengeacr123
```

### Deploy with custom resource group and app name
```bash
./deploy-image.sh demotriviachallengeacr123 \
  -g rg-triviachallenge-prod \
  -a demo-triviachallenge-api-prod
```

### Deploy specific version without cache
```bash
./deploy-image.sh demotriviachallengeacr123 \
  --image-tag v2.1.0 \
  --no-cache
```

### Deploy to different environment
```bash
# Development
./deploy-image.sh myacr -g rg-triviachallenge-dev -a myapp-api-dev -t dev-latest

# Staging
./deploy-image.sh myacr -g rg-triviachallenge-staging -a myapp-api-staging -t staging-latest

# Production
./deploy-image.sh myacr -g rg-triviachallenge-prod -a myapp-api-prod -t v1.0.0
```

## Getting Your ACR Name

If you don't know your ACR name, you can find it using:

```bash
# List all ACRs in a resource group
az acr list --resource-group rg-triviachallenge-bicep --query "[].{Name:name, LoginServer:loginServer}" -o table

# Or from Bicep deployment outputs
az deployment group show \
  --resource-group rg-triviachallenge-bicep \
  --name acrDeployment \
  --query properties.outputs.acrName.value -o tsv
```

## Getting Your App Service Name

If auto-discovery fails, you can find your App Service name using:

```bash
# List all App Services in a resource group
az webapp list --resource-group rg-triviachallenge-bicep --query "[].name" -o table

# Or from Bicep deployment outputs
az deployment group show \
  --resource-group rg-triviachallenge-bicep \
  --name appServiceDeployment \
  --query properties.outputs.appServiceName.value -o tsv
```

## Monitoring Deployment

After deployment, monitor the application with these commands:

```bash
# View live logs
az webapp log tail --name <app-name> --resource-group <resource-group>

# Check deployment status
az webapp show --name <app-name> --resource-group <resource-group> --query state -o tsv

# View container settings
az webapp config container show --name <app-name> --resource-group <resource-group>
```

## Troubleshooting

### Issue: "Not logged into Azure"
**Solution**: Login to Azure:
```bash
az login
# Or for service principal
az login --service-principal -u <app-id> -p <password> --tenant <tenant-id>
```

### Issue: "Cannot access ACR" or "Failed to login to ACR"
**Solution**: The script will provide detailed instructions. Common fixes:

1. **Verify ACR exists and you have access:**
   ```bash
   az acr list --query "[].{Name:name, ResourceGroup:resourceGroup}" -o table
   ```

2. **Check your permissions:**
   ```bash
   # Replace with your ACR details
   az role assignment list \
     --assignee $(az account show --query user.name -o tsv) \
     --scope $(az acr show -n <acr-name> -g <resource-group> --query id -o tsv)
   ```

3. **Grant AcrPush permissions (requires admin):**
   ```bash
   az role assignment create \
     --assignee $(az account show --query user.name -o tsv) \
     --role AcrPush \
     --scope $(az acr show -n <acr-name> -g <resource-group> --query id -o tsv)
   ```

### Issue: "Could not automatically discover App Service name"
**Solution**: Provide the app name explicitly:
```bash
./deploy-image.sh <acr-name> -a <app-name>
```

### Issue: Docker build fails
**Solution**: Try building without cache:
```bash
./deploy-image.sh <acr-name> --no-cache
```

### Issue: "Failed to push image to ACR"
**Solution**: The script will provide guidance. Common fixes:

1. **Check Docker is running:**
   ```bash
   docker info
   ```

2. **Manually login to ACR:**
   ```bash
   az acr login --name <acr-name>
   ```

3. **Retry the push:**
   ```bash
  docker push <acr-login-server>/triviachallenge:<tag>
   ```

### Issue: Authentication error when pushing to ACR
**Solution**: Ensure you're logged into Azure and have permissions:
```bash
az login
az acr login --name <acr-name>
```

### Issue: Web app not pulling latest image
**Solution**: 
1. Check if the image was pushed successfully:
   ```bash
  az acr repository show-tags --name <acr-name> --repository triviachallenge
   ```
2. Manually restart the web app:
   ```bash
   az webapp restart --name <app-name> --resource-group <resource-group>
   ```
3. Verify the container settings:
   ```bash
   az webapp config container show --name <app-name> --resource-group <resource-group>
   ```

## Integration with CI/CD

This script can be integrated into CI/CD pipelines:

### GitHub Actions Example
```yaml
- name: Deploy to Azure
  run: |
    ./deploy-image.sh ${{ secrets.ACR_NAME }} \
      -g ${{ secrets.RESOURCE_GROUP }} \
      -a ${{ secrets.APP_NAME }} \
      -t ${{ github.sha }}
```

### Azure DevOps Pipeline Example
```yaml
- script: |
    ./deploy-image.sh $(ACR_NAME) \
      -g $(RESOURCE_GROUP) \
      -a $(APP_NAME) \
      -t $(Build.BuildId)
  displayName: 'Deploy Docker Image'
```

## Advanced Usage

### Building with Multi-stage Optimization
The Dockerfile uses multi-stage builds to optimize the final image:
- Stage 1: Build .NET backend
- Stage 2: Build React frontend
- Stage 3: Combine into minimal runtime image

### Custom Tags Strategy
Use semantic versioning for production releases:
```bash
# Development builds
./deploy-image.sh myacr -t dev-$(date +%Y%m%d-%H%M%S)

# Release candidates
./deploy-image.sh myacr -t rc-1.0.0

# Production releases
./deploy-image.sh myacr -t v1.0.0
```

## See Also

- [Bicep Infrastructure](./infra/README.md)
- [Docker Documentation](./DOCKER.md)
- [Development Workflow](./README.md)
