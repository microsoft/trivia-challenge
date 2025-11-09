# PR Preview Environment - Quick Setup Guide

This guide helps you configure GitHub secrets required for PR preview environments.

## Authentication Methods

You can use either **OIDC (recommended)** or **Service Principal** authentication.

### Option 1: OIDC Authentication (Recommended)

OIDC (OpenID Connect) is more secure as it doesn't require storing long-lived credentials.

**Required Secrets:**
- `AZURE_CLIENT_ID` - Application (client) ID
- `AZURE_TENANT_ID` - Directory (tenant) ID
- `AZURE_SUBSCRIPTION_ID` - Subscription ID
- `ACR_NAME` - Azure Container Registry name
- `AZURE_RESOURCE_GROUP` - Resource group for preview environments
- `AZURE_LOCATION` (optional) - Azure region (defaults to `eastus`)

**Setup Steps:**

1. **Create an Azure AD Application and Service Principal:**
```bash
# Create the app registration
az ad app create --display-name "iq-challenge-pr-previews-oidc"

# Get the Application (client) ID
APP_ID=$(az ad app list --display-name "iq-challenge-pr-previews-oidc" --query "[0].appId" -o tsv)

# Create a service principal for the app
az ad sp create --id $APP_ID

# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "iq-challenge-pr-previews-oidc" --query "[0].id" -o tsv)
```

2. **Configure Federated Credentials for GitHub:**
```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Get your tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)

# Create federated credential for the main branch (optional)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "iq-challenge-pr-previews-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:microsoft/iq-challenge:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "iq-challenge-pr-previews-prs",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:microsoft/iq-challenge:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

3. **Grant Azure Permissions:**
```bash
# Grant Contributor on resource group
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/{resource-group}

# Grant AcrPush on ACR
ACR_ID=$(az acr show --name {acr-name} --query id -o tsv)
az role assignment create \
  --assignee $APP_ID \
  --role AcrPush \
  --scope $ACR_ID
```

4. **Add GitHub Secrets:**
- `AZURE_CLIENT_ID`: Value from `$APP_ID`
- `AZURE_TENANT_ID`: Value from `$TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`: Value from `$SUBSCRIPTION_ID`

### Option 2: Service Principal Authentication (Legacy)

Uses a service principal with client secret (less secure, requires credential rotation).

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON
- `ACR_NAME` - Azure Container Registry name
- `AZURE_RESOURCE_GROUP` - Resource group for preview environments
- `AZURE_LOCATION` (optional) - Azure region (defaults to `eastus`)

**Setup:**
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

**Grant Permissions:**
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

## Common Secrets (Both Methods)

### ACR_NAME
Name of your Azure Container Registry.

**Example:** `myacrname`

**Setup:**
```bash
# Get your ACR name
az acr list --query "[].{Name:name}" -o table
```

### AZURE_RESOURCE_GROUP
Resource group where preview environments will be deployed.

**Example:** `rg-iq-challenge-preview`

**Setup:**
```bash
# Create a dedicated resource group for previews (recommended)
az group create \
  --name rg-iq-challenge-preview \
  --location eastus
```

### AZURE_LOCATION (Optional)
Azure region for deployments. Defaults to `eastus` if not provided.

**Example:** `eastus`, `westus2`, `northeurope`

## Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret based on your chosen authentication method:

**For OIDC (Recommended):**
- Name: `AZURE_CLIENT_ID` → Value: (application/client ID)
- Name: `AZURE_TENANT_ID` → Value: (directory/tenant ID)
- Name: `AZURE_SUBSCRIPTION_ID` → Value: (subscription ID)
- Name: `ACR_NAME` → Value: (your ACR name)
- Name: `AZURE_RESOURCE_GROUP` → Value: (your resource group name)
- Name: `AZURE_LOCATION` → Value: (optional, e.g., `eastus`)

**For Service Principal:**
- Name: `AZURE_CREDENTIALS` → Value: (paste the JSON from service principal creation)
- Name: `ACR_NAME` → Value: (your ACR name)
- Name: `AZURE_RESOURCE_GROUP` → Value: (your resource group name)
- Name: `AZURE_LOCATION` → Value: (optional, e.g., `eastus`)

## Service Principal Permissions

The service principal or app registration needs:

1. **Contributor** role on the resource group (for creating/deleting container instances)
2. **AcrPush** role on the Azure Container Registry (for pushing images)

These permissions are included in the setup steps above.

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
- For OIDC: Verify client-id, tenant-id, subscription-id are correct
- For Service Principal: Verify AZURE_CREDENTIALS JSON is valid
- Verify the identity has AcrPush role on the ACR

### "Cannot create container instance"
- Verify the identity has Contributor role on resource group
- Check resource group exists in the correct subscription
- Verify AZURE_LOCATION is a valid region

### "OIDC login failed"
- Verify federated credentials are configured correctly in Azure AD
- Check that the subject matches: `repo:microsoft/iq-challenge:pull_request`
- Ensure `id-token: write` permission is set in the workflow
- Verify client-id, tenant-id, and subscription-id secrets are correct

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
