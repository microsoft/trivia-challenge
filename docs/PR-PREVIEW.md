# PR Preview Environment

This feature allows you to quickly deploy and test pull requests in a live Azure environment.

## How It Works

### 🚀 Deploy a Preview Environment

1. Open a pull request
2. Comment `#deploy` on the PR
3. The GitHub Action will:
   - Add a 🚀 reaction to your comment
   - Build Docker images with PR-specific tags
   - Push images to Azure Container Registry
   - Deploy to Azure Container Instances
   - Comment back with the preview URL

The preview environment includes:
- The IQ Challenge application (from your PR branch)
- Azure Cosmos DB Emulator (for data storage)

### 🧹 Automatic Cleanup

When the PR is closed (merged or not), the preview environment is automatically deleted to save resources.

## Prerequisites

The following secrets must be configured in the GitHub repository:

**For OIDC Authentication (Recommended):**
- `AZURE_CLIENT_ID` - Application (client) ID
- `AZURE_TENANT_ID` - Directory (tenant) ID
- `AZURE_SUBSCRIPTION_ID` - Subscription ID
- `ACR_NAME` - Name of the Azure Container Registry
- `AZURE_RESOURCE_GROUP` - Resource group for preview deployments
- `AZURE_LOCATION` (optional) - Azure region for deployments (defaults to `eastus`)

**For Service Principal Authentication (Legacy):**
- `AZURE_CREDENTIALS` - Azure service principal credentials in JSON format
- `ACR_NAME` - Name of the Azure Container Registry
- `AZURE_RESOURCE_GROUP` - Resource group for preview deployments
- `AZURE_LOCATION` (optional) - Azure region for deployments (defaults to `eastus`)

**→ See [PR-PREVIEW-SETUP.md](PR-PREVIEW-SETUP.md) for detailed setup instructions.**

## Manual Deployment (GitHub-Agnostic)

The deployment script can be run manually or from any CI/CD system:

```bash
./scripts/deploy-pr-preview.sh <acr-name> <pr-number> <git-sha>
```

Example:
```bash
./scripts/deploy-pr-preview.sh myacr 123 abc1234567890
```

This script:
- Builds the Docker image
- Tags it with `pr-{number}-{sha}` and `pr-{number}-latest`
- Pushes to Azure Container Registry

## Architecture

```
Pull Request
    │
    ├─ Comment: #deploy
    │
    └─ GitHub Action
        │
        ├─ Build Docker Image
        │   └─ Tag: pr-{number}-{sha}
        │
        ├─ Push to ACR
        │
        └─ Deploy to Azure Container Instances (via YAML)
            │
            ├─ App Container (Your PR code)
            │   └─ Port 80
            │
            └─ Cosmos DB Emulator
                └─ Port 8081
```

The deployment uses an Azure Container Instances YAML file (`azure-container-instance.yml`) which defines a multi-container group similar to docker-compose but in ACI-native format. This allows deploying both the application and Cosmos DB emulator together.

## Resource Naming

All resources follow a consistent naming pattern:

- **Container Group**: `iq-pr-{number}`
- **DNS Label**: `iq-pr-{number}` (unique FQDN)
- **Image Tags**: `pr-{number}-{sha}`, `pr-{number}-latest`

## Costs and Limits

- Each preview environment uses Azure Container Instances (pay-per-second billing)
- Default resources: 2 CPU cores, 4 GB RAM
- Preview environments are automatically cleaned up when PRs close
- Consider setting Azure spending limits or quotas for preview deployments

## Troubleshooting

### Preview deployment fails

1. Check that all required secrets are configured
2. Verify Azure service principal has correct permissions
3. Check Azure Container Registry quota and limits
4. Review workflow logs for detailed error messages

### Preview URL is not accessible

1. Wait a few minutes - the Cosmos DB emulator takes time to initialize
2. Check Azure Portal for container instance status
3. Review container logs in Azure Portal

### Manual cleanup required

If automatic cleanup fails, manually delete the container group:

```bash
az container delete \
  --resource-group {resource-group} \
  --name iq-pr-{number} \
  --yes
```

## Security Considerations

- Preview environments use the Cosmos DB emulator (not production data)
- CORS is configured to allow all origins (`*`) for preview testing
- Each PR gets an isolated environment
- Environments are temporary and automatically cleaned up
- The Cosmos DB emulator uses well-known public test credentials (safe for ephemeral environments)

### SSL/TLS and HTTPS

**Important:** Azure Container Instances do not provide built-in SSL/TLS termination. Preview environments are accessible via HTTP only (`http://`), not HTTPS.

**For HTTPS support, you have these options:**

1. **Accept HTTP for preview environments** (simplest)
   - Preview environments are temporary and used for testing
   - No production data or sensitive information
   - Access can be restricted via network policies if needed

2. **Use Azure Application Gateway** (production-grade)
   - Add Application Gateway with SSL termination in front of ACI
   - Requires additional Azure resources and configuration
   - Increases cost (~$0.05/hour for Gateway + $0.10/hour for ACI)
   - See [Application Gateway with ACI](https://docs.microsoft.com/azure/container-instances/container-instances-application-gateway)

3. **Migrate to Azure Container Apps** (recommended for production)
   - Container Apps provide built-in SSL/TLS termination
   - Automatic HTTPS with managed certificates
   - Better for production-like environments
   - Slightly higher complexity in deployment

4. **Use a reverse proxy container** (intermediate)
   - Add an nginx or Caddy container with SSL in the container group
   - Use Let's Encrypt for certificates (requires domain validation)
   - More complex setup but keeps everything in ACI

**Recommendation:** For PR previews, HTTP is generally acceptable since these are temporary testing environments without sensitive data. If HTTPS is required, consider migrating to Azure Container Apps for a better long-term solution.

## Limitations

- Preview deployments use Azure Container Instances (not Azure Container Apps or Kubernetes)
- **No built-in SSL/TLS termination** - Preview URLs use HTTP only (see Security Considerations above)
- No custom domain support (uses Azure-provided FQDN)
- Limited to single-region deployment
- Cosmos DB emulator limitations apply (no replication, limited throughput)
