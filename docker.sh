#!/bin/bash

# IQ Challenge Docker Helper Script
# Usage: ./docker.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    cat << EOF
IQ Challenge Docker Helper

Usage: ./docker.sh [command]

Commands:
    prod:build       Build production image
    prod:up          Start production environment (requires .env with Azure Cosmos DB)
    prod:down        Stop production environment
    prod:logs        View production logs
    prod:restart     Restart production environment
    
    local:up         Start local test environment (with Cosmos DB Emulator)
    local:down       Stop local test environment
    local:logs       View local test logs
    
    dev:up           Start development environment (api + cosmos emulator)
    dev:down         Stop development environment
    dev:logs         View development logs
    dev:frontend     Start frontend dev server (run in separate terminal)
    
    build            Build production Docker image only
    clean            Remove all containers, volumes, and images
    cosmos:url       Show Cosmos DB Emulator URL
    health           Check application health
    shell            Open shell in running production container
    help             Show this help message

Examples:
    ./docker.sh local:up         # Local testing with Cosmos Emulator
    ./docker.sh prod:up          # Production with Azure Cosmos DB (needs .env)
    ./docker.sh dev:up           # Start dev API + Cosmos DB
    ./docker.sh dev:frontend     # Start frontend (in another terminal)
    ./docker.sh clean            # Clean everything

Environment Setup:
    Production requires .env file with Azure Cosmos DB credentials:
    1. cp .env.example .env
    2. Edit .env with your Azure Cosmos DB details
    3. ./docker.sh prod:up

EOF
}

case "$1" in
    prod:build)
        echo "🏗️  Building production image..."
        docker-compose build
        echo "✅ Production image built successfully"
        ;;
    
    prod:up)
        echo "🚀 Starting production environment..."
        if [ ! -f ".env" ]; then
            echo ""
            echo "⚠️  WARNING: .env file not found!"
            echo "   Production requires Azure Cosmos DB credentials."
            echo "   Copy .env.example to .env and fill in your credentials:"
            echo ""
            echo "   cp .env.example .env"
            echo "   # Then edit .env with your Azure Cosmos DB details"
            echo ""
            echo "   Or use 'local:up' for local testing with Cosmos DB Emulator"
            echo ""
            exit 1
        fi
        docker-compose up -d
        echo ""
        echo "✅ Production environment started!"
        echo "   🌐 Application: http://localhost:8080"
        echo ""
        echo "📝 View logs: ./docker.sh prod:logs"
        ;;
    
    prod:down)
        echo "🛑 Stopping production environment..."
        docker-compose down
        echo "✅ Production environment stopped"
        ;;
    
    prod:logs)
        docker-compose logs -f
        ;;
    
    prod:restart)
        echo "🔄 Restarting production environment..."
        docker-compose down
        docker-compose up -d
        echo "✅ Production environment restarted"
        ;;
    
    local:up)
        echo "🚀 Starting local test environment (with Cosmos DB Emulator)..."
        docker-compose -f docker-compose.local.yml up -d
        echo ""
        echo "✅ Local test environment started!"
        echo "   🌐 Application: http://localhost:8080"
        echo "   🗄️  Cosmos DB: https://localhost:8081/_explorer/index.html"
        echo ""
        echo "📝 View logs: ./docker.sh local:logs"
        ;;
    
    local:down)
        echo "🛑 Stopping local test environment..."
        docker-compose -f docker-compose.local.yml down
        echo "✅ Local test environment stopped"
        ;;
    
    local:logs)
        docker-compose -f docker-compose.local.yml logs -f
        ;;
    
    dev:up)
        echo "🚀 Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        echo ""
        echo "✅ Development environment started!"
        echo "   🔌 Backend API: http://localhost:5000"
        echo "   📚 Swagger UI: http://localhost:5000/swagger"
        echo "   🗄️  Cosmos DB: https://localhost:8081/_explorer/index.html"
        echo ""
        echo "📝 Start frontend: ./docker.sh dev:frontend (in another terminal)"
        echo "📝 View logs: ./docker.sh dev:logs"
        ;;
    
    dev:down)
        echo "🛑 Stopping development environment..."
        docker-compose -f docker-compose.dev.yml down
        echo "✅ Development environment stopped"
        ;;
    
    dev:logs)
        docker-compose -f docker-compose.dev.yml logs -f
        ;;
    
    dev:frontend)
        echo "🎨 Starting frontend development server..."
        cd frontend
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi
        npm run dev
        ;;
    
    build)
        echo "🏗️  Building production Docker image..."
        docker build -t iq-challenge:latest .
        echo "✅ Docker image built: iq-challenge:latest"
        ;;
    
    clean)
        echo "🧹 Cleaning up Docker resources..."
        echo "⚠️  This will remove containers, volumes, and images for this project"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker-compose -f docker-compose.local.yml down -v
            docker-compose -f docker-compose.dev.yml down -v
            docker rmi iq-challenge:latest 2>/dev/null || true
            docker rmi iq-challenge-dev:latest 2>/dev/null || true
            echo "✅ Cleanup complete"
        else
            echo "❌ Cleanup cancelled"
        fi
        ;;
    
    cosmos:url)
        echo "🗄️  Cosmos DB Emulator URLs:"
        echo "   Web UI: https://localhost:8081/_explorer/index.html"
        echo "   Endpoint: https://localhost:8081"
        echo "   Primary Key: C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
        ;;
    
    health)
        echo "🏥 Checking application health..."
        if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
            echo "✅ Production app is healthy"
            curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
        elif curl -sf http://localhost:5000/health > /dev/null 2>&1; then
            echo "✅ Development API is healthy"
            curl -s http://localhost:5000/health | jq . 2>/dev/null || curl -s http://localhost:5000/health
        else
            echo "❌ No healthy application found"
            echo "   Try: ./docker.sh prod:up  or  ./docker.sh dev:up"
            exit 1
        fi
        ;;
    
    shell)
        echo "🐚 Opening shell in production container..."
        docker exec -it iq-challenge-app /bin/sh
        ;;
    
    help|--help|-h|"")
        show_help
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
