#!/bin/bash

##################################################
# Trivia Challenge - Docker Build & Deploy Script
##################################################
# 
# This script builds the Docker image, pushes it to Azure Container Registry,
# and ensures the Azure Web App pulls the latest image.
#
# Usage: ./deploy-image.sh <acr-name> [options]
#
# Arguments:
#   acr-name              Name of the Azure Container Registry (required)
#
# Options:
#   --resource-group, -g  Resource group name (default: rg-triviachallenge-bicep)
#   --app-name, -a        App Service name (if not provided, will be discovered)
#   --slot, -s            App Service deployment slot (optional, deploys to production slot if not specified)
#   --image-tag, -t       Additional image tag to apply (default: latest)
#   --no-cache            Build without Docker cache
#   --station-lockdown    Enable station lockdown build mode (default: disabled)
#   --help, -h            Show this help message
#
# Examples:
#   ./deploy-image.sh myacrname
#   ./deploy-image.sh myacrname -g my-resource-group -a my-webapp
#   ./deploy-image.sh myacrname --slot staging
#   ./deploy-image.sh myacrname --image-tag v1.2.3 --no-cache
#
##################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RESOURCE_GROUP="rg-triviachallenge-bicep"
IMAGE_TAG="latest"
APP_NAME=""
SLOT=""
NO_CACHE=false
ENABLE_STATION_LOCKDOWN=false

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

##################################################
# Helper Functions
##################################################

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

show_help() {
    head -n 29 "$0" | tail -n +3 | sed 's/^# //' | sed 's/^#//'
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        echo ""
        echo "Install Docker from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install Azure CLI first."
        echo ""
        echo "Install Azure CLI:"
        echo "  macOS:   brew install azure-cli"
        echo "  Linux:   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
        echo "  Windows: https://aka.ms/installazurecliwindows"
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        echo ""
        echo "To login to Azure:"
        echo "  az login"
        echo ""
        echo "Or for service principal authentication:"
        echo "  az login --service-principal -u <app-id> -p <password> --tenant <tenant-id>"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

check_acr_access() {
    local acr_name=$1
    
    log_info "Verifying ACR access..."
    
    # Get ACR resource ID for later use
    local acr_id=$(az acr show --name "$acr_name" --resource-group "$RESOURCE_GROUP" --query id -o tsv 2>/dev/null || true)
    
    if [ -z "$acr_id" ]; then
        log_error "Cannot access ACR '$acr_name' in resource group '$RESOURCE_GROUP'"
        echo ""
        echo "Possible issues:"
        echo "  1. ACR doesn't exist - verify the name"
        echo "  2. Wrong resource group - check with: az acr list -o table"
        echo "  3. Insufficient permissions - you need at least 'Reader' role"
        echo ""
        echo "To list all ACRs you have access to:"
        echo "  az acr list --query \"[].{Name:name, ResourceGroup:resourceGroup, Location:location}\" -o table"
        exit 1
    fi
    
    log_success "ACR found: $acr_name"
    
    # Check current user/identity
    local current_user=$(az account show --query user.name -o tsv)
    local user_type=$(az account show --query user.type -o tsv)
    
    log_info "Current identity: $current_user (type: $user_type)"
    
    # Check for push permissions via role assignments
    log_info "Checking ACR push permissions..."
    
    local has_push_role=false
    local role_check=$(az role assignment list \
        --assignee "$current_user" \
        --scope "$acr_id" \
        --query "[?roleDefinitionName=='AcrPush' || roleDefinitionName=='Contributor' || roleDefinitionName=='Owner'].roleDefinitionName" \
        -o tsv 2>/dev/null || true)
    
    if [ -n "$role_check" ]; then
        has_push_role=true
        log_success "Found ACR push permissions: $role_check"
    else
        log_warning "No direct ACR role assignment found (this is OK if using group membership or subscription-level roles)"
    fi
    
    # Try to login to ACR for Docker operations
    log_info "Authenticating with ACR for Docker push..."
    
    if az acr login --name "$acr_name" --expose-token --output none 2>/dev/null; then
        log_success "ACR authentication successful"
    else
        log_error "Failed to authenticate with ACR '$acr_name'"
        echo ""
        echo "This could mean:"
        echo "  1. You don't have push permissions (need 'AcrPush' or 'Contributor' role)"
        echo "  2. Docker daemon is not running"
        echo "  3. Network connectivity issues"
        echo ""
        echo "To check your role assignments:"
        echo "  az role assignment list --assignee $current_user --scope $acr_id"
        echo ""
        echo "To grant push permissions (requires admin):"
        echo "  az role assignment create \\"
        echo "    --assignee $current_user \\"
        echo "    --role AcrPush \\"
        echo "    --scope $acr_id"
        echo ""
        echo "Note: The Web App will use its managed identity to pull images."
        echo "      You only need push permissions to upload the image."
        exit 1
    fi
    
    log_success "ACR access verified"
}

check_webapp_managed_identity() {
    local app_name=$1
    local slot=$2
    
    if [ -z "$app_name" ]; then
        return 0  # Skip check if app name not yet discovered
    fi
    
    local slot_args=()
    if [ -n "$slot" ]; then
        slot_args=(--slot "$slot")
    fi
    
    log_info "Checking Web App managed identity configuration..."
    
    # Check if web app has managed identity enabled
    local mi_enabled=$(az webapp identity show \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        "${slot_args[@]}" \
        --query principalId -o tsv 2>/dev/null || echo "")
    
    if [ -z "$mi_enabled" ]; then
        log_warning "Web App does not have system-assigned managed identity enabled"
        echo ""
        echo "For production deployments, it's recommended to:"
        echo "  1. Enable managed identity on the Web App"
        echo "  2. Grant AcrPull role to the managed identity"
        echo "  3. Configure Web App to use managed identity for ACR access"
        echo ""
        echo "Commands:"
        echo "  # Enable managed identity"
        echo "  az webapp identity assign --name $app_name --resource-group $RESOURCE_GROUP"
        echo ""
        echo "  # Grant ACR pull permissions"
        echo "  az role assignment create \\"
        echo "    --assignee \$(az webapp identity show -n $app_name -g $RESOURCE_GROUP --query principalId -o tsv) \\"
        echo "    --role AcrPull \\"
        echo "    --scope \$(az acr show -n $ACR_NAME -g $RESOURCE_GROUP --query id -o tsv)"
        echo ""
        echo "  # Configure Web App to use managed identity"
        echo "  az webapp config set --name $app_name --resource-group $RESOURCE_GROUP \\"
        echo "    --generic-configurations '{\"acrUseManagedIdentityCreds\": true}'"
        echo ""
        read -p "Continue anyway? (y/n): " continue_deploy
        if [ "$continue_deploy" != "y" ]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    else
        log_success "Web App has managed identity enabled"
        
        # Check if ACR pull role is assigned
        local acr_id=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
        local has_acr_pull=$(az role assignment list \
            --assignee "$mi_enabled" \
            --scope "$acr_id" \
            --query "[?roleDefinitionName=='AcrPull'].roleDefinitionName" \
            -o tsv 2>/dev/null || echo "")
        
        if [ -n "$has_acr_pull" ]; then
            log_success "Managed identity has AcrPull permissions"
            log_info "Web App will use managed identity to pull the image (no credentials needed)"
        else
            log_warning "Managed identity does not have AcrPull role on ACR"
            echo ""
            echo "To grant ACR pull permissions:"
            echo "  az role assignment create \\"
            echo "    --assignee $mi_enabled \\"
            echo "    --role AcrPull \\"
            echo "    --scope $acr_id"
            echo ""
        fi
    fi
}

##################################################
# Parse Arguments
##################################################

if [ $# -eq 0 ]; then
    log_error "Missing required argument: acr-name"
    echo ""
    show_help
fi

ACR_NAME=""

while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        -g|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -a|--app-name)
            APP_NAME="$2"
            shift 2
            ;;
        -s|--slot)
            SLOT="$2"
            shift 2
            ;;
        -t|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --station-lockdown)
            ENABLE_STATION_LOCKDOWN=true
            shift
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            ;;
        *)
            if [ -z "$ACR_NAME" ]; then
                ACR_NAME="$1"
            else
                log_error "Unexpected argument: $1"
                show_help
            fi
            shift
            ;;
    esac
done

if [ -z "$ACR_NAME" ]; then
    log_error "ACR name is required"
    show_help
fi

##################################################
# Main Script
##################################################

echo ""
log_info "========================================"
log_info "Trivia Challenge - Docker Build & Deploy"
log_info "========================================"
echo ""

check_prerequisites

# Check ACR access and login
check_acr_access "$ACR_NAME"

# Get ACR login server
log_info "Getting ACR login server..."
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query loginServer --output tsv)

log_success "ACR Login Server: $ACR_LOGIN_SERVER"

# Build image coordinates
IMAGE_REPO="$ACR_LOGIN_SERVER/triviachallenge"

log_info "Retrieving Git commit SHA..."
if ! command -v git >/dev/null 2>&1; then
    log_error "Git is required to determine the commit SHA for tagging"
    exit 1
fi

GIT_SHA=$(git -C "$SCRIPT_DIR" rev-parse --short=12 HEAD 2>/dev/null || true)

if [ -z "$GIT_SHA" ]; then
    log_error "Unable to determine Git commit SHA. Ensure this script is run within a Git repository."
    exit 1
fi

log_success "Git SHA: $GIT_SHA"

TAGS_TO_PUSH=("latest" "$GIT_SHA")

if [ "$IMAGE_TAG" != "latest" ] && [ "$IMAGE_TAG" != "$GIT_SHA" ]; then
    TAGS_TO_PUSH+=("$IMAGE_TAG")
fi

log_info "Image repository: $IMAGE_REPO"
log_info "Tags to apply: ${TAGS_TO_PUSH[*]}"

# Step 1: Build Docker Image
log_info "========================================"
log_info "Step 1: Building Docker image..."
log_info "========================================"
echo ""
log_info "Image repository: $IMAGE_REPO"
log_info "Git SHA tag: $GIT_SHA"
if [ "$IMAGE_TAG" != "latest" ] && [ "$IMAGE_TAG" != "$GIT_SHA" ]; then
    log_info "Additional tag: $IMAGE_TAG"
fi
log_info "All tags: ${TAGS_TO_PUSH[*]}"
log_info "Context: $SCRIPT_DIR"

if [ "$NO_CACHE" = true ]; then
    log_warning "Building without cache..."
fi

STATION_LOCKDOWN_VALUE="false"
if [ "$ENABLE_STATION_LOCKDOWN" = true ]; then
    STATION_LOCKDOWN_VALUE="true"
fi

log_info "Station lockdown build flag: $STATION_LOCKDOWN_VALUE"

cd "$SCRIPT_DIR"

BUILD_CMD=(docker build)

if [ "$NO_CACHE" = true ]; then
    BUILD_CMD+=("--no-cache")
fi

for tag in "${TAGS_TO_PUSH[@]}"; do
    BUILD_CMD+=(-t "$IMAGE_REPO:$tag")
done

BUILD_CMD+=(--build-arg "VITE_REQUIRE_STATION_ID=$STATION_LOCKDOWN_VALUE")
BUILD_CMD+=(-f Dockerfile .)

"${BUILD_CMD[@]}"

log_success "Docker image built successfully"
echo ""

# Step 2: Push Image to ACR
log_info "========================================"
log_info "Step 2: Pushing image to ACR..."
log_info "========================================"
echo ""

log_info "(Already logged in from prerequisite check)"

for tag in "${TAGS_TO_PUSH[@]}"; do
    local_image="$IMAGE_REPO:$tag"
    log_info "Pushing image: $local_image"
    if ! docker push "$local_image"; then
        log_error "Failed to push image tag '$tag' to ACR"
        echo ""
        echo "This could be due to:"
        echo "  1. Network connectivity issues"
        echo "  2. ACR storage quota exceeded"
        echo "  3. ACR service temporarily unavailable"
        echo ""
        echo "Try logging in again manually:"
        echo "  az acr login --name $ACR_NAME"
        echo ""
        echo "Then retry the push:"
        echo "  docker push $local_image"
        exit 1
    fi
done

log_success "All image tags pushed successfully"
echo ""

# Step 3: Restart Web App to Pull Latest Image
log_info "========================================"
log_info "Step 3: Updating Web App..."
log_info "========================================"
echo ""

# Build slot arguments if a deployment slot was specified
SLOT_ARGS=()
if [ -n "$SLOT" ]; then
    SLOT_ARGS=(--slot "$SLOT")
    log_info "Deployment slot: $SLOT"
fi

# Discover App Service name if not provided
if [ -z "$APP_NAME" ]; then
    log_info "Discovering App Service name..."
    APP_NAME=$(az webapp list --resource-group "$RESOURCE_GROUP" --query "[?tags.project=='trivia-challenge'].name | [0]" --output tsv 2>/dev/null || true)
    
    if [ -z "$APP_NAME" ]; then
        log_warning "Could not automatically discover App Service name."
        log_warning "Please provide it with --app-name or restart manually with:"
        echo ""
        echo "  az webapp restart --name <app-name> --resource-group $RESOURCE_GROUP"
        echo ""
        exit 0
    fi
    
    log_success "Discovered App Service: $APP_NAME"
fi

# Check Web App managed identity configuration
check_webapp_managed_identity "$APP_NAME" "$SLOT"

# Update the container image configuration
log_info "Updating container image configuration..."
az webapp config container set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    "${SLOT_ARGS[@]}" \
    --docker-custom-image-name "$IMAGE_REPO:$GIT_SHA" \
    --docker-registry-server-url "https://$ACR_LOGIN_SERVER"

log_success "Container configuration updated"

# Restart the Web App to pull the latest image
log_info "Restarting Web App to pull latest image..."
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" "${SLOT_ARGS[@]}"

log_success "Web App restarted successfully"
echo ""

# Wait a moment for restart to initialize
log_info "Waiting for restart to initialize..."
sleep 5

# Get the Web App URL
APP_URL=$(az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" "${SLOT_ARGS[@]}" --query defaultHostName --output tsv)

log_info "========================================"
log_success "Deployment Complete!"
log_info "========================================"
echo ""
log_info "Image repository: $IMAGE_REPO"
log_info "Tags pushed: ${TAGS_TO_PUSH[*]}"
log_info "Web App image: $IMAGE_REPO:$GIT_SHA"
log_info "App Service: $APP_NAME"
if [ -n "$SLOT" ]; then
    log_info "Deployment slot: $SLOT"
fi
log_info "URL: https://$APP_URL"
echo ""
log_info "Monitor deployment status:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP ${SLOT_ARGS[*]}"
echo ""
log_info "Check container logs:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP ${SLOT_ARGS[*]}"
echo ""
log_success "Done! 🎉"
echo ""