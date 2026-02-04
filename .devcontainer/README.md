# Development Container Setup

This project uses a Docker Compose-based development container with the Azure Cosmos DB Emulator.

## What's Included

- **Node.js 22** with TypeScript support
- **.NET 10 SDK** for backend API development
- **Azure Cosmos DB Emulator** for local database development
- **Azure Static Web Apps CLI** for local testing

## Services

### App Container
- Main development environment
- Shares network with Cosmos DB Emulator
- Has access to all development tools

### Cosmos DB Emulator
- Runs the Azure Cosmos DB Emulator on `https://localhost:8081`
- Data Explorer UI: `https://localhost:8081/_explorer/index.html`
- Uses well-known emulator key: `C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`
- Data persists in a Docker volume

## First Time Setup

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the containers to build and start (~5-10 minutes first time)
4. The post-create script will:
   - Install Node.js dependencies
   - Install Azure Static Web Apps CLI
   - Wait for Cosmos DB Emulator to be ready
   - Download and trust the Cosmos DB Emulator SSL certificate
   - Restore .NET dependencies

## Running the Application

### Start the .NET API
```bash
cd backend/TriviaChallenge.Api
dotnet run
```

### Start the Frontend
```bash
npm run dev
```

### Access Services
- **Frontend**: http://localhost:5173
- **.NET API**: http://localhost:5000
- **Cosmos DB Data Explorer**: https://localhost:8081/_explorer/index.html
- **API Documentation**: http://localhost:5000/swagger

## Cosmos DB Emulator

### Connection Details
- **Endpoint**: `https://localhost:8081`
- **Primary Key**: `C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`

### Certificate Trust
The post-create script automatically downloads and trusts the Cosmos DB Emulator's self-signed certificate. If you encounter SSL issues, you can manually trust it:

```bash
curl -k https://localhost:8081/_explorer/emulator.pem > /tmp/cosmos_emulator.crt
sudo cp /tmp/cosmos_emulator.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### Data Persistence
Data is stored in the `cosmos-data` Docker volume. To reset the database:

```bash
docker volume rm trivia-challenge_cosmos-data
```

## Troubleshooting

### Cosmos DB Emulator Not Starting
If the Cosmos DB Emulator doesn't start:

1. Check if it's running:
   ```bash
   curl -k https://localhost:8081/_explorer/index.html
   ```

2. Check Docker logs:
   ```bash
   docker logs azure-cosmos-emulator
   ```

3. Restart the container:
   ```bash
   docker restart azure-cosmos-emulator
   ```

### Certificate Issues
If you get SSL/TLS errors when connecting to Cosmos DB:

1. Re-download the certificate:
   ```bash
   curl -k https://localhost:8081/_explorer/emulator.pem > /tmp/cosmos_emulator.crt
   ```

2. Trust it system-wide:
   ```bash
   sudo cp /tmp/cosmos_emulator.crt /usr/local/share/ca-certificates/
   sudo update-ca-certificates
   ```

### Port Conflicts
If you get port conflicts, check if the ports are already in use:

```bash
lsof -i :8081  # Cosmos DB Emulator
lsof -i :5000  # .NET API
lsof -i :5173  # Vite dev server
```

## Rebuilding the Container

If you need to rebuild the development container:

1. Press `F1` or `Ctrl+Shift+P`
2. Type "Rebuild Container"
3. Select "Dev Containers: Rebuild Container"

## Resources

- [Azure Cosmos DB Emulator](https://docs.microsoft.com/azure/cosmos-db/local-emulator)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker Compose](https://docs.docker.com/compose/)
