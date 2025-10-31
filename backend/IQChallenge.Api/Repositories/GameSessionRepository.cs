using Microsoft.Azure.Cosmos;
using IQChallenge.Api.Models;
using IQChallenge.Api.Services;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for GameSession operations
/// </summary>
public class GameSessionRepository : IGameSessionRepository
{
    private readonly Container _container;
    private readonly ILogger<GameSessionRepository> _logger;

    public GameSessionRepository(CosmosDbService cosmosDbService, ILogger<GameSessionRepository> logger)
    {
        _container = cosmosDbService.GameSessionsContainer;
        _logger = logger;
    }

    public async Task<GameSession?> GetByIdAsync(string sessionId, string? userId)
    {
        try
        {
            if (userId == null)
            {
                _logger.LogWarning("UserId is required to retrieve session {SessionId}", sessionId);
                return null;
            }

            var response = await _container.ReadItemAsync<GameSession>(
                sessionId,
                new PartitionKey(userId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Session with ID {SessionId} not found", sessionId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<List<GameSession>> GetByUserIdAsync(string userId)
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startTime DESC")
                .WithParameter("@userId", userId);

            var iterator = _container.GetItemQueryIterator<GameSession>(query);
            var sessions = new List<GameSession>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                sessions.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} sessions for user {UserId}", sessions.Count, userId);
            return sessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sessions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<GameSession> CreateAsync(GameSession session)
    {
        try
        {
            session.StartTime = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(
                session,
                new PartitionKey(session.UserId));
            
            _logger.LogInformation("Created session {SessionId} for user {UserId}",
                session.Id, session.UserId);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session for user {UserId}", session.UserId);
            throw;
        }
    }

    public async Task<GameSession> UpdateAsync(GameSession session)
    {
        try
        {
            session.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.ReplaceItemAsync(
                session,
                session.Id,
                new PartitionKey(session.UserId));
            
            _logger.LogInformation("Updated session {SessionId}", session.Id);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating session {SessionId}", session.Id);
            throw;
        }
    }

    public async Task<List<GameSession>> GetTopScoresAsync(int count, DateTime? since = null)
    {
        try
        {
            var queryText = since.HasValue
                ? "SELECT * FROM c WHERE c.status = 'completed' AND c.completedAt >= @since ORDER BY c.totalScore DESC"
                : "SELECT * FROM c WHERE c.status = 'completed' ORDER BY c.totalScore DESC";

            var queryDefinition = new QueryDefinition(queryText);
            if (since.HasValue)
            {
                queryDefinition = queryDefinition.WithParameter("@since", since.Value);
            }

            var iterator = _container.GetItemQueryIterator<GameSession>(
                queryDefinition,
                requestOptions: new QueryRequestOptions { MaxItemCount = count });

            var sessions = new List<GameSession>();

            if (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                sessions.AddRange(response.Take(count));
            }

            _logger.LogInformation("Retrieved top {Count} scores", sessions.Count);
            return sessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving top scores");
            throw;
        }
    }
}
