#!/bin/bash

##################################################
# IQ Challenge - PR Preview Environment Deployment
##################################################
# 
# This GitHub-agnostic script builds Docker images and pushes them to
# Azure Container Registry with PR-specific tags.
#
# Usage: ./deploy-pr-preview.sh <acr-name> <pr-number> <git-sha>
#
# Arguments:
#   acr-name              Name of the Azure Container Registry (required)
#   pr-number             Pull Request number (required)
#   git-sha               Git commit SHA (required)
#
# Environment Variables (optional):
#   NO_CACHE              Set to 'true' to build without Docker cache
#
# Examples:
#   ./deploy-pr-preview.sh myacrname 123 abc1234
#   NO_CACHE=true ./deploy-pr-preview.sh myacrname 123 abc1234
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
    head -n 21 "$0" | tail -n +3 | sed 's/^# //' | sed 's/^#//'
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
        exit 1
    fi
    
    log_success "All prerequisites met"
}

##################################################
# Parse Arguments
##################################################

if [ $# -lt 3 ]; then
    log_error "Missing required arguments"
    echo ""
    show_help
fi

ACR_NAME="$1"
PR_NUMBER="$2"
GIT_SHA="$3"

# Validate PR number is numeric
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
    log_error "PR number must be numeric: $PR_NUMBER"
    exit 1
fi

# Validate git SHA format (allow short or full SHA)
if ! [[ "$GIT_SHA" =~ ^[a-f0-9]{7,40}$ ]]; then
    log_error "Invalid git SHA format: $GIT_SHA"
    exit 1
fi

# Get NO_CACHE from environment, default to false
NO_CACHE="${NO_CACHE:-false}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

##################################################
# Main Script
##################################################

echo ""
log_info "========================================"
log_info "IQ Challenge - PR Preview Deployment"
log_info "========================================"
echo ""
log_info "ACR Name:    $ACR_NAME"
log_info "PR Number:   $PR_NUMBER"
log_info "Git SHA:     $GIT_SHA"
log_info "Build Cache: $([ "$NO_CACHE" = "true" ] && echo "Disabled" || echo "Enabled")"
echo ""

check_prerequisites

# Login to ACR
log_info "Authenticating with ACR..."
if ! az acr login --name "$ACR_NAME" 2>/dev/null; then
    log_error "Failed to authenticate with ACR '$ACR_NAME'"
    echo ""
    echo "Please ensure:"
    echo "  1. ACR exists and is accessible"
    echo "  2. You have push permissions (AcrPush role)"
    echo "  3. Docker daemon is running"
    exit 1
fi
log_success "ACR authentication successful"

# Get ACR login server
log_info "Getting ACR details..."
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
if [ -z "$ACR_LOGIN_SERVER" ]; then
    log_error "Failed to get ACR login server"
    exit 1
fi
log_success "ACR Login Server: $ACR_LOGIN_SERVER"

# Build image coordinates
IMAGE_REPO="$ACR_LOGIN_SERVER/iqchallenge"

# Define tags
# Format: pr-{NUMBER}-{SHA} and pr-{NUMBER}-latest
TAG_SHA="pr-${PR_NUMBER}-${GIT_SHA:0:12}"
TAG_LATEST="pr-${PR_NUMBER}-latest"

TAGS_TO_PUSH=("$TAG_SHA" "$TAG_LATEST")

log_info "Image repository: $IMAGE_REPO"
log_info "Tags to apply: ${TAGS_TO_PUSH[*]}"
echo ""

# Build Docker Image
log_info "========================================"
log_info "Building Docker image..."
log_info "========================================"
echo ""

cd "$SCRIPT_DIR"

BUILD_CMD=(docker build)

if [ "$NO_CACHE" = "true" ]; then
    BUILD_CMD+=("--no-cache")
    log_warning "Building without cache..."
fi

for tag in "${TAGS_TO_PUSH[@]}"; do
    BUILD_CMD+=(-t "$IMAGE_REPO:$tag")
done

BUILD_CMD+=(-f Dockerfile .)

log_info "Running: ${BUILD_CMD[*]}"
echo ""

"${BUILD_CMD[@]}"

log_success "Docker image built successfully"
echo ""

# Push Image to ACR
log_info "========================================"
log_info "Pushing images to ACR..."
log_info "========================================"
echo ""

for tag in "${TAGS_TO_PUSH[@]}"; do
    local_image="$IMAGE_REPO:$tag"
    log_info "Pushing: $local_image"
    if ! docker push "$local_image"; then
        log_error "Failed to push image tag '$tag' to ACR"
        exit 1
    fi
    log_success "Pushed: $tag"
done

echo ""
log_info "========================================"
log_success "Build and Push Complete!"
log_info "========================================"
echo ""
log_info "Image repository: $IMAGE_REPO"
log_info "Tags pushed:"
for tag in "${TAGS_TO_PUSH[@]}"; do
    log_info "  - $tag"
done
echo ""
log_success "Done! 🎉"
echo ""

# Output image reference for use in deployment
echo "IMAGE_TAG=$TAG_SHA" >> "${GITHUB_OUTPUT:-/dev/null}" 2>/dev/null || true
echo "IMAGE_FULL=$IMAGE_REPO:$TAG_SHA" >> "${GITHUB_OUTPUT:-/dev/null}" 2>/dev/null || true
