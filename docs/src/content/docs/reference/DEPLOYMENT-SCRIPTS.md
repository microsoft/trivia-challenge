# Deployment Scripts - Summary

## Overview

Three bash scripts have been created to streamline the Docker image build, push, and deployment process to Azure:

### 1. `deploy-image.sh` - Main Deployment Script ⭐

**Purpose**: Build Docker image, push to ACR, and update Azure Web App

**Features**:
- ✅ Builds Docker image with multi-stage optimization
- ✅ Tags image with customizable version tags
- ✅ Pushes to Azure Container Registry
- ✅ Updates Web App container configuration
- ✅ Restarts Web App to pull latest image
- ✅ Auto-discovery of App Service name
- ✅ Comprehensive error handling and logging
- ✅ Color-coded console output
- ✅ Prerequisite checks (Docker, Azure CLI, authentication)

**Usage**:
```bash
./deploy-image.sh <acr-name> [options]

Options:
  -g, --resource-group    Resource group (default: rg-triviachallenge-bicep)
  -a, --app-name         App Service name (auto-discovered if not provided)
  -s, --slot             Deployment slot (optional)
  -t, --image-tag        Image tag (default: latest)
  --no-cache             Build without Docker cache
  --help                 Show help message
```

**Examples**:
```bash
# Basic deployment
./deploy-image.sh myacrname

# Full options
./deploy-image.sh myacrname -g my-rg -a my-app -t v1.0.0

# Force rebuild
./deploy-image.sh myacrname --no-cache
```

### 2. `quick-deploy.sh` - Simplified Deployment Wrapper

**Purpose**: Wrapper around deploy-image.sh with saved configurations

**Features**:
- ✅ Saves environment-specific configurations
- ✅ Interactive setup on first run
- ✅ Environment-aware (dev/staging/prod)
- ✅ Production deployment confirmation
- ✅ Custom tag support
- ✅ Configuration management

**Usage**:
```bash
./quick-deploy.sh <environment> [options]

Environments:
  dev       Development environment
  staging   Staging environment
  prod      Production environment (requires version tag)
  custom    Custom parameters (one-time use)
  config    View/edit saved configuration
```

**Examples**:
```bash
# First time setup (will prompt for ACR, RG, App name)
./quick-deploy.sh dev

# Subsequent deployments
./quick-deploy.sh dev
./quick-deploy.sh staging
./quick-deploy.sh prod --tag v1.2.3

# View/edit configuration
./quick-deploy.sh config
```

**Configuration File**:
- Stored in `.deploy-config` (ignored by git)
- Contains ACR names, resource groups, app names for each environment
- Editable manually or via `./quick-deploy.sh config`

### 3. `deployment-help.sh` - Documentation Helper

**Purpose**: Quick reference guide for all deployment scripts

**Usage**:
```bash
./deployment-help.sh
```

Shows:
- Available scripts and their purposes
- Quick start guide
- Common workflows
- Troubleshooting tips
- Documentation links

## How It Works

### Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    deploy-image.sh                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─► 1. Check Prerequisites
                            │   ├─ Docker installed?
                            │   ├─ Azure CLI installed?
                            │   └─ Logged into Azure?
                            │
                            ├─► 2. Get ACR Login Server
                            │   └─ az acr show --name <acr>
                            │
                            ├─► 3. Build Docker Image
                            │   ├─ Multi-stage build:
                            │   │  ├─ Stage 1: Build .NET backend
                            │   │  ├─ Stage 2: Build React frontend
                            │   │  └─ Stage 3: Combine in runtime image
                            │   └─ Tag: <acr>.azurecr.io/triviachallenge:<tag>
                            │
                            ├─► 4. Login to ACR
                            │   └─ az acr login --name <acr>
                            │
                            ├─► 5. Push Image
                            │   └─ docker push <image>
                            │
                            ├─► 6. Discover App Service (if needed)
                            │   └─ az webapp list --query "[?tags.project=='trivia-challenge']"
                            │
                            ├─► 7. Update Container Configuration
                            │   └─ az webapp config container set
                            │
                            └─► 8. Restart Web App
                                └─ az webapp restart
```

### Integration with Bicep Infrastructure

The scripts work seamlessly with the Bicep-deployed infrastructure:

1. **Container Registry**: Uses ACR deployed via `infra/main.bicep`
2. **Managed Identity**: Web App uses system-assigned MI for ACR pull
3. **Automatic Discovery**: Finds resources using Bicep tags (`project: trivia-challenge`)
4. **CI/CD Ready**: Webhook-enabled for automatic deployments

### Key Implementation Details

#### Image Naming Convention
```
<acr-login-server>/triviachallenge:<tag>

Examples:
  demotriviachallengeacr123.azurecr.io/triviachallenge:latest
  demotriviachallengeacr123.azurecr.io/triviachallenge:v1.0.0
  demotriviachallengeacr123.azurecr.io/triviachallenge:dev-20250131-143022
```

#### App Service Update Process
1. Updates `linuxFxVersion` to new image
2. Updates `DOCKER_REGISTRY_SERVER_URL` 
3. Keeps `acrUseManagedIdentityCreds: true` for authentication
4. Restarts app to pull new image from ACR

#### Auto-Discovery Logic
```bash
# Discovers first app tagged with project=trivia-challenge
az webapp list \
  --resource-group <rg> \
  --query "[?tags.project=='trivia-challenge'].name | [0]"
```

## Usage Patterns

### Development Workflow
```bash
# Local testing
./docker.sh local:up

# Make changes...

# Deploy to dev
./quick-deploy.sh dev
```

### Staging Workflow
```bash
# Deploy to staging with timestamp tag
./quick-deploy.sh staging --tag staging-$(date +%Y%m%d-%H%M%S)

# Or use latest
./quick-deploy.sh staging
```

### Production Workflow
```bash
# Production requires explicit version tag
./quick-deploy.sh prod --tag v1.0.0

# Alternative with full control
./deploy-image.sh prodacrname \
  -g rg-prod \
  -a app-prod \
  -t v1.0.0
```

### CI/CD Integration
See `.github/workflows/deploy-azure.yml.example` for GitHub Actions example

## Files Created

```
/workspaces/trivia-challenge/
├── deploy-image.sh                        # Main deployment script
├── quick-deploy.sh                        # Simplified wrapper
├── deployment-help.sh                     # Help/documentation
├── DEPLOY-IMAGE.md                        # Detailed documentation
├── .deploy-config                         # Config (gitignored)
└── .github/
    └── workflows/
        └── deploy-azure.yml.example       # CI/CD example
```

## Benefits

### For Developers
- ✅ One command to deploy (`./quick-deploy.sh dev`)
- ✅ No need to remember ACR names or resource groups
- ✅ Fast iteration cycle
- ✅ Consistent deployment process

### For Operations
- ✅ Automated and repeatable
- ✅ Error handling and validation
- ✅ Comprehensive logging
- ✅ Easy to integrate with CI/CD

### For Teams
- ✅ Standardized deployment process
- ✅ Environment-specific configurations
- ✅ Production safeguards (confirmation prompts)
- ✅ Self-documenting with help commands

## Next Steps

1. **First Time Setup**:
   ```bash
   ./quick-deploy.sh dev  # Will prompt for configuration
   ```

2. **Configure Additional Environments**:
   ```bash
   ./quick-deploy.sh staging  # Setup staging
   ./quick-deploy.sh prod     # Setup production
   ```

3. **Deploy**:
   ```bash
   ./quick-deploy.sh dev      # Development
   ./quick-deploy.sh prod -t v1.0.0  # Production
   ```

4. **CI/CD Integration**:
   - Copy `.github/workflows/deploy-azure.yml.example` to `.github/workflows/deploy-azure.yml`
   - Configure GitHub secrets
   - Enable workflow

## Troubleshooting

Run the help script for common issues:
```bash
./deployment-help.sh
```

Or check individual script help:
```bash
./deploy-image.sh --help
./quick-deploy.sh --help
```

## Additional Resources

- **Deployment Documentation**: [DEPLOY-IMAGE.md](./DEPLOY-IMAGE.md)
- **Docker Guide**: [DOCKER.md](./DOCKER.md)
- **Infrastructure Guide**: [infra/README.md](./infra/README.md)
- **Main README**: [README.md](./README.md)
