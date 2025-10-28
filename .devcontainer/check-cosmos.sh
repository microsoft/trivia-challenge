#!/bin/bash

# Script to check if Cosmos DB Emulator is ready

echo "Checking Cosmos DB Emulator status..."

# Check if the emulator endpoint is accessible
if curl -k -s https://localhost:8081/_explorer/index.html > /dev/null 2>&1; then
    echo "✅ Cosmos DB Emulator is running and accessible at https://localhost:8081"
    echo ""
    echo "📊 Data Explorer: https://localhost:8081/_explorer/index.html"
    echo "🔑 Primary Key: C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
    echo ""
    exit 0
else
    echo "❌ Cosmos DB Emulator is not accessible"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check if the container is running:"
    echo "   docker ps | grep cosmos-emulator"
    echo ""
    echo "2. View container logs:"
    echo "   docker logs azure-cosmos-emulator"
    echo ""
    echo "3. Restart the container:"
    echo "   docker restart azure-cosmos-emulator"
    echo ""
    echo "4. Wait a few minutes for the emulator to start (it can take 2-5 minutes)"
    echo ""
    exit 1
fi
