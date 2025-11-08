# PR Preview Environment - Quick Setup Guide

This guide helps you configure GitHub secrets required for PR preview environments.

## Required GitHub Secrets

### 1. AZURE_CREDENTIALS
Service principal credentials in JSON format.

**Setup:**
```bash
# Create a service principal with contributor access
az ad sp create-for-rbac \
  --name "iq-challenge-pr-previews" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

Copy the JSON output and add it as the `AZURE_CREDENTIALS` secret in GitHub.

Example output:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### 2. ACR_NAME
Name of your Azure Container Registry.

**Example:** `myacrname`

**Setup:**
```bash
# Get your ACR name
az acr list --query "[].{Name:name}" -o table
```

### 3. AZURE_RESOURCE_GROUP
Resource group where preview environments will be deployed.

**Example:** `rg-iq-challenge-preview`

**Setup:**
```bash
# Create a dedicated resource group for previews (recommended)
az group create \
  --name rg-iq-challenge-preview \
  --location eastus
```

### 4. AZURE_LOCATION (Optional)
Azure region for deployments. Defaults to `eastus` if not provided.

**Example:** `eastus`, `westus2`, `northeurope`

## Service Principal Permissions

The service principal needs:

1. **Contributor** role on the resource group (for creating/deleting container instances)
2. **AcrPush** role on the Azure Container Registry (for pushing images)

**Grant permissions:**
```bash
# Get the service principal ID
SP_ID=$(az ad sp list --display-name "iq-challenge-pr-previews" --query "[0].id" -o tsv)

# Grant Contributor on resource group
az role assignment create \
  --assignee $SP_ID \
  --role Contributor \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}

# Grant AcrPush on ACR
ACR_ID=$(az acr show --name {acr-name} --query id -o tsv)
az role assignment create \
  --assignee $SP_ID \
  --role AcrPush \
  --scope $ACR_ID
```

## Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `AZURE_CREDENTIALS` → Value: (paste the JSON from step 1)
   - Name: `ACR_NAME` → Value: (your ACR name)
   - Name: `AZURE_RESOURCE_GROUP` → Value: (your resource group name)
   - Name: `AZURE_LOCATION` → Value: (optional, e.g., `eastus`)

## Verification

After adding secrets, test the deployment:

1. Create a test PR
2. Comment `#deploy` on the PR
3. Watch the Actions tab for the workflow run
4. If successful, a comment will appear with the preview URL
5. Close the PR to verify cleanup works

## Troubleshooting

### "Failed to authenticate with ACR"
- Verify ACR_NAME is correct
- Verify service principal has AcrPush role
- Check AZURE_CREDENTIALS JSON is valid

### "Cannot create container instance"
- Verify service principal has Contributor role on resource group
- Check resource group exists in the correct subscription
- Verify AZURE_LOCATION is a valid region

### "Workflow does not trigger"
- Ensure comment is on a pull request (not an issue)
- Verify comment contains `#deploy` (case sensitive)
- Check workflow file permissions in .github/workflows/

## Cost Estimation

Each preview environment costs approximately:
- **Azure Container Instances**: ~$0.10/hour (2 CPU, 4GB RAM)
- **Azure Container Registry**: Storage costs (minimal for PR images)

Preview environments are automatically deleted when PRs close to minimize costs.

## Security Notes

- Preview environments use the Cosmos DB emulator (not production data)
- CORS is configured to allow all origins for testing
- Environments are isolated per PR
- Clean up happens automatically
- The Cosmos DB emulator key is public (designed for testing only)
