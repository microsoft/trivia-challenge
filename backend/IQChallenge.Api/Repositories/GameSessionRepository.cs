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

    public async Task<GameSession?> GetByIdAsync(string sessionId)
    {
        try
        {
            var response = await _container.ReadItemAsync<GameSession>(
                sessionId,
                new PartitionKey(sessionId));
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

    public async Task<List<GameSession>> GetByUserEmailAsync(string userEmail)
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.userEmail = @userEmail ORDER BY c.createdAt DESC")
                .WithParameter("@userEmail", userEmail);

            var iterator = _container.GetItemQueryIterator<GameSession>(query);
            var sessions = new List<GameSession>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                sessions.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} sessions for user {UserEmail}", sessions.Count, userEmail);
            return sessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sessions for user {UserEmail}", userEmail);
            throw;
        }
    }

    public async Task<GameSession> CreateAsync(GameSession session)
    {
        try
        {
            session.CreatedAt = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(
                session,
                new PartitionKey(session.Id));
            
            _logger.LogInformation("Created session {SessionId} for user {UserEmail}",
                session.Id, session.UserEmail);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session for user {UserEmail}", session.UserEmail);
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
                new PartitionKey(session.Id));
            
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
