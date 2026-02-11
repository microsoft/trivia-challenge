#!/bin/bash

##################################################
# Trivia Challenge - Deployment Scripts Overview
##################################################

cat << 'EOF'

╔══════════════════════════════════════════════════════════════╗
║        Trivia Challenge - Deployment Scripts Overview       ║
╚══════════════════════════════════════════════════════════════╝

📦 AVAILABLE DEPLOYMENT SCRIPTS
────────────────────────────────────────────────────────────────

1. deploy-image.sh (⭐ Recommended)
   Full-featured deployment with all options
   
   Usage:
     ./deploy-image.sh <acr-name> [options]
   
   Options:
     -g, --resource-group    Resource group name
     -a, --app-name         App Service name
     -s, --slot             Deployment slot (optional)
     -t, --image-tag        Image tag (default: latest)
     --no-cache             Build without cache
     --station-lockdown     Enable station lockdown build mode
   
   Perfect for: All deployments, CI/CD pipelines, custom workflows


2. docker.sh (Local Development)
   Local testing and development
   
   Usage:
     ./docker.sh local:up     # Full local environment
     ./docker.sh dev:up       # Backend + DB only
     ./docker.sh prod:up      # Production mode
   
   Perfect for: Local testing before deployment

────────────────────────────────────────────────────────────────
🚀 QUICK START GUIDE
────────────────────────────────────────────────────────────────

Step 1: Deploy Infrastructure (One-time)
  cd infra
  az deployment group create \
    --resource-group rg-triviachallenge-bicep \
    --parameters main.dev.bicepparam

Step 2: Deploy Application
  ./deploy-image.sh <acr-name>

Step 3: For subsequent deployments
  ./deploy-image.sh <acr-name>                       # Default
  ./deploy-image.sh <acr-name> -t v1.0.0             # With version tag
  ./deploy-image.sh <acr-name> -g <rg> -a <app>      # Custom targets

────────────────────────────────────────────────────────────────
📚 DOCUMENTATION
────────────────────────────────────────────────────────────────

  docs/deploying-infrastructure.md   Infrastructure deployment guide
  docs/deploying-code.md             Code deployment guide
  docs/development-setup.md          Development environment setup
  docs/telemetry-events.md           Analytics events reference
  infra/README.md                    Bicep template reference
  README.md                          General project documentation

────────────────────────────────────────────────────────────────
🔧 COMMON WORKFLOWS
────────────────────────────────────────────────────────────────

Development Workflow:
  1. Make code changes
  2. Test locally: ./docker.sh local:up
  3. Deploy to dev: ./deploy-image.sh <acr-name>
  4. Verify: az webapp log tail --name <app-name> -g <rg>

Release Workflow:
  1. Test in dev environment
  2. Deploy to staging: ./deploy-image.sh <acr-name> -g <rg-staging> -a <app-staging>
  3. Run integration tests
  4. Deploy to prod: ./deploy-image.sh <acr-name> -g <rg-prod> -a <app-prod> -t v1.0.0
  5. Tag git release: git tag v1.0.0 && git push --tags

────────────────────────────────────────────────────────────────
💡 TIPS & TRICKS
────────────────────────────────────────────────────────────────

• Use --no-cache when dependencies change
• Tag production releases with semantic versioning (v1.0.0)
• Monitor deployments with: az webapp log tail
• Check deployment status: az webapp show --query state
• Rollback by deploying a previous tag

────────────────────────────────────────────────────────────────
🆘 TROUBLESHOOTING
────────────────────────────────────────────────────────────────

Can't find ACR name?
  az acr list -g <resource-group> --query "[].name" -o table

Can't find App Service name?
  az webapp list -g <resource-group> --query "[].name" -o table

Deployment failed?
  Check logs: az webapp log tail -n <app-name> -g <rg>
  Retry with: ./deploy-image.sh <acr-name> --no-cache

────────────────────────────────────────────────────────────────

For detailed help on any script, run: <script-name> --help

Example:
  ./deploy-image.sh --help
  ./docker.sh help

────────────────────────────────────────────────────────────────

EOF