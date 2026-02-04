#!/bin/bash

echo "🚀 Setting up Trivia Challenge development environment..."

# Install Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Install Static Web Apps CLI globally
echo "📦 Installing Azure Static Web Apps CLI..."
npm install -g @azure/static-web-apps-cli

# Wait for Cosmos DB Emulator to be ready
echo "⏳ Waiting for Cosmos DB Emulator to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -k https://localhost:8081/_explorer/emulator.pem > /dev/null 2>&1; then
        echo "✅ Cosmos DB Emulator is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - Waiting for Cosmos DB Emulator..."
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️  Cosmos DB Emulator did not start in time. You may need to start it manually."
else
    # Download and trust the Cosmos DB Emulator certificate
    echo "🔐 Downloading Cosmos DB Emulator certificate..."
    curl -k https://localhost:8081/_explorer/emulator.pem > /tmp/cosmos_emulator.crt
    
    # Import certificate to system trust store
    if [ -f "/tmp/cosmos_emulator.crt" ]; then
        sudo cp /tmp/cosmos_emulator.crt /usr/local/share/ca-certificates/
        sudo update-ca-certificates
        echo "✅ Cosmos DB Emulator certificate installed"
    fi
fi

# Restore .NET dependencies
if [ -d "backend/TriviaChallenge.Api" ]; then
    echo "📦 Restoring .NET dependencies..."
    cd backend/TriviaChallenge.Api
    dotnet restore
    cd ../..
fi

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Quick Start:"
echo "   - Cosmos DB Emulator: https://localhost:8081/_explorer/index.html"
echo "   - Start .NET API: cd backend/TriviaChallenge.Api && dotnet run"
echo "   - Start Frontend: npm run dev"
echo ""
