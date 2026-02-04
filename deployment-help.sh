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

1. quick-deploy.sh (⭐ Recommended)
   Simple deployment with saved configurations
   
   Usage:
     ./quick-deploy.sh dev                    # Deploy to dev
     ./quick-deploy.sh staging                # Deploy to staging
     ./quick-deploy.sh prod --tag v1.0.0      # Deploy to prod
     ./quick-deploy.sh config                 # Edit config

   Perfect for: Regular deployments, team collaboration


2. deploy-image.sh (Advanced)
   Full-featured deployment with all options
   
   Usage:
     ./deploy-image.sh <acr-name> [options]
   
   Options:
     -g, --resource-group    Resource group name
     -a, --app-name         App Service name
     -t, --image-tag        Image tag (default: latest)
     --no-cache             Build without cache
   
   Perfect for: CI/CD pipelines, custom workflows


3. docker.sh (Local Development)
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

Step 2: Configure Quick Deploy (One-time)
  ./quick-deploy.sh dev
  # Enter your ACR name and resource group when prompted

Step 3: Deploy Application
  ./quick-deploy.sh dev

Step 4: For subsequent deployments
  ./quick-deploy.sh dev              # Development
  ./quick-deploy.sh staging          # Staging
  ./quick-deploy.sh prod -t v1.0.0   # Production

────────────────────────────────────────────────────────────────
📚 DOCUMENTATION
────────────────────────────────────────────────────────────────

  DEPLOY-IMAGE.md       Detailed deployment documentation
  DOCKER.md             Docker development guide
  infra/README.md       Infrastructure deployment guide
  README.md             General project documentation

────────────────────────────────────────────────────────────────
🔧 COMMON WORKFLOWS
────────────────────────────────────────────────────────────────

Development Workflow:
  1. Make code changes
  2. Test locally: ./docker.sh local:up
  3. Deploy to dev: ./quick-deploy.sh dev
  4. Verify: az webapp log tail --name <app-name> -g <rg>

Release Workflow:
  1. Test in dev environment
  2. Deploy to staging: ./quick-deploy.sh staging
  3. Run integration tests
  4. Deploy to prod: ./quick-deploy.sh prod --tag v1.0.0
  5. Tag git release: git tag v1.0.0 && git push --tags

Hotfix Workflow:
  1. Create hotfix branch
  2. Make urgent fix
  3. Test locally: ./docker.sh local:up
  4. Deploy directly to prod: ./quick-deploy.sh prod --tag v1.0.1-hotfix

────────────────────────────────────────────────────────────────
💡 TIPS & TRICKS
────────────────────────────────────────────────────────────────

• Use --no-cache when dependencies change
• Tag production releases with semantic versioning (v1.0.0)
• Use environment-specific tags for dev/staging (dev-latest)
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
  Retry with: ./quick-deploy.sh <env> --no-cache

Configuration issues?
  Edit config: ./quick-deploy.sh config
  Or delete: rm .deploy-config

────────────────────────────────────────────────────────────────

For detailed help on any script, run: <script-name> --help

Example:
  ./deploy-image.sh --help
  ./quick-deploy.sh --help
  ./docker.sh help

────────────────────────────────────────────────────────────────

EOF
