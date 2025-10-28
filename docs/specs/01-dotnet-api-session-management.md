# 01: .NET API with Session Management and Question Serving

Create a .NET 10 Minimal API that serves as the backend foundation for the Microsoft Fabric IQ Challenge. This API will handle user session management, serve randomized questions from Cosmos DB, and provide an endpoint for uploading question sets via www-urlencoded form data.

## Functional Requirements

- Create RESTful API endpoints for user session creation and management
- Implement question serving with randomization from Cosmos DB
- Support session-based user tracking without requiring authentication
- Provide endpoints for retrieving user sessions and game state
- Include www-urlencoded form endpoint for uploading question sets to Cosmos DB
- Handle CORS configuration for frontend communication
- Include comprehensive API documentation with OpenAPI/Swagger

## Technical Requirements

- Use .NET 10 Minimal API architecture
- Integrate Azure Cosmos DB for data persistence (questions, sessions, scores)
- Implement proper dependency injection and service registration
- Add input validation and error handling middleware
- Configure logging for debugging and monitoring
- Set up development environment with Cosmos DB emulator support
- Follow RESTful API design principles with appropriate HTTP status codes
- Implement efficient Cosmos DB connection pooling and configuration

## Subtasks

- [x] Set up .NET 10 Minimal API project structure with proper configuration
- [x] Configure Azure Cosmos DB SDK and connection management
- [x] Create models for User Session, Question, and API responses with Cosmos DB attributes
- [x] Implement Cosmos DB repository pattern for questions and sessions
- [x] Create session management endpoints (create, get, update session)
- [x] Implement question serving endpoint with randomization from Cosmos DB
- [x] Add www-urlencoded form endpoint for question set upload
- [x] Configure CORS, logging, and error handling middleware
- [x] Add OpenAPI/Swagger documentation
- [x] Implement input validation and proper HTTP status codes
- [x] Set up Cosmos DB emulator configuration for development
- [x] Add unit tests for core API functionality and Cosmos DB operations

## Implementation Details

### Project Structure
- **Models/**: Data models (Question, UserSession, CosmosDbSettings) and DTOs (request/response models)
- **Services/**: CosmosDbService for database client management and initialization
- **Repositories/**: Repository pattern implementations (QuestionRepository, SessionRepository) with interfaces
- **Middleware/**: ExceptionHandlingMiddleware and RequestLoggingMiddleware
- **Tests/**: xUnit test project with 20 passing tests

### Key Components

#### Cosmos DB Configuration
- Singleton CosmosClient with connection pooling and retry policies
- CosmosDbService manages database and container initialization
- Partition keys: Questions (/id), Sessions (/userId), Scores (/userId)
- Automatic database/container creation on startup

#### API Endpoints Implemented
1. **Session Management**
   - POST `/api/sessions` - Create new session
   - GET `/api/sessions/{sessionId}` - Get session details (requires userId query param)
   - POST `/api/sessions/{sessionId}/start` - Start game session
   - POST `/api/sessions/{sessionId}/complete` - Complete session

2. **Question Management**
   - POST `/api/questions/upload` - Upload questions via form-urlencoded
   - GET `/api/questions/random` - Get random questions with optional difficulty filter
   - GET `/api/sessions/{sessionId}/next-question` - Get next question for active session
   - POST `/api/sessions/{sessionId}/submit-answer` - Submit answer with scoring logic

#### Game Mechanics
- **Base Timer**: 60 seconds (1 minute)
- **Streak Bonuses**: +20 seconds every 3 correct answers (max 120 seconds total)
- **Scoring**: 
  - Easy: 10 points base
  - Medium: 20 points base
  - Hard: 30 points base
  - Time bonus: up to 50% of base points for fast answers
- **Difficulty Progression**:
  - Start at "easy"
  - 5+ streak → "medium"
  - 10+ streak → "hard"
- **Forgiving Streak**: Wrong answer reduces streak by 3 (not to 0)

#### Middleware Stack
1. ExceptionHandlingMiddleware - Global error handling
2. RequestLoggingMiddleware - HTTP request/response logging
3. CORS - Configured for local frontend development
4. Swagger/OpenAPI - Interactive API documentation

### Configuration
- appsettings.json: Production settings with Cosmos DB configuration
- appsettings.Development.json: Development settings with local emulator
- Default Cosmos DB Emulator endpoint: https://localhost:8081
- CORS allowed origins: http://localhost:5173, http://localhost:3000

### Testing
- 20 unit tests covering:
  - Question model validation
  - UserSession state management
  - ApiResponse wrapper functionality
  - Repository pattern structure
- Test framework: xUnit with Moq for mocking

### NuGet Packages
- Microsoft.Azure.Cosmos 3.54.0
- Swashbuckle.AspNetCore 9.0.6
- Microsoft.AspNetCore.OpenApi 9.0.10
- Newtonsoft.Json 13.0.4

## Feedback

*To be filled during the review step*