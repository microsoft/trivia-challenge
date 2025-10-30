# IQ Challenge API

Backend API for the Microsoft Fabric IQ Challenge quiz game.

## Technologies

- .NET 10 Minimal API
- Azure Cosmos DB
- Swashbuckle (OpenAPI/Swagger)

## Prerequisites

- .NET 10 SDK
- Azure Cosmos DB Emulator (for local development)
  - Download from: https://aka.ms/cosmosdb-emulator
  - Or use Docker: `docker run -p 8081:8081 -p 10251:10251 -p 10252:10252 -p 10253:10253 -p 10254:10254 -m 3g --cpus=2.0 --name=cosmos-emulator -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=true mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest`

## Configuration

The API uses Azure Cosmos DB for data persistence. Configuration is in `appsettings.json`.

### Cosmos DB Authentication

The API supports two authentication methods:

#### 1. PrimaryKey Authentication (Development/Testing)
```json
{
  "CosmosDb": {
    "EndpointUri": "https://localhost:8081",
    "PrimaryKey": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "DatabaseName": "IQChallengeDb",
    "QuestionsContainerName": "Questions",
    "SessionsContainerName": "Sessions",
    "ScoresContainerName": "Scores"
  }
}
```

#### 2. Managed Identity Authentication (Production - Recommended)
```json
{
  "CosmosDb": {
    "EndpointUri": "https://your-cosmosdb-account.documents.azure.com:443/",
    "DatabaseName": "IQChallengeDb",
    "QuestionsContainerName": "Questions",
    "SessionsContainerName": "Sessions",
    "ScoresContainerName": "Scores"
  }
}
```
*Note: When `PrimaryKey` is omitted, the API automatically uses Azure Managed Identity.*

See [COSMOS-AUTH-UPDATE.md](./COSMOS-AUTH-UPDATE.md) for detailed authentication setup instructions.

For production, update these values in environment variables or Azure App Service configuration.

## Running Locally

1. Start the Cosmos DB Emulator (or Docker container)

2. Run the API:
   ```bash
   cd backend/IQChallenge.Api
   dotnet run
   ```

3. Access Swagger UI at: `https://localhost:5001/swagger`

The API will automatically:
- Initialize the Cosmos DB database and containers on startup
- Configure CORS for local frontend development
- Enable detailed logging in Development mode

## API Endpoints

### Session Management
- `POST /api/sessions` - Create a new game session
- `GET /api/sessions/{sessionId}` - Get session details
- `POST /api/sessions/{sessionId}/start` - Start a game session
- `POST /api/sessions/{sessionId}/complete` - Complete a session

### Questions
- `POST /api/questions/upload` - Upload questions via form data
- `GET /api/questions/random` - Get random questions
- `GET /api/sessions/{sessionId}/next-question` - Get next question for session
- `POST /api/sessions/{sessionId}/submit-answer` - Submit an answer

## Project Structure

```
IQChallenge.Api/
├── Models/           # Data models and DTOs
├── Services/         # Business logic services
├── Repositories/     # Data access layer
├── Middleware/       # Custom middleware
├── Program.cs        # Application entry point
└── appsettings.json  # Configuration
```

## Development

### Adding New Endpoints

1. Define models in `Models/`
2. Create repository interfaces and implementations in `Repositories/`
3. Add service logic in `Services/` if needed
4. Define endpoints in `Program.cs`
5. Add validation attributes to request DTOs

### Testing

Run tests with:
```bash
dotnet test
```

## Deployment

The API is designed to run in Azure App Service with:
- Azure Cosmos DB (production)
- Application Insights for monitoring
- GitHub Actions for CI/CD

See deployment documentation in `/docs` for details.
