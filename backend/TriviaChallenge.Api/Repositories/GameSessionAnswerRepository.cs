using Microsoft.Azure.Cosmos;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Services;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for GameSessionAnswer operations
/// </summary>
public class GameSessionAnswerRepository : IGameSessionAnswerRepository
{
    private readonly Container _container;
    private readonly ILogger<GameSessionAnswerRepository> _logger;

    public GameSessionAnswerRepository(CosmosDbService cosmosDbService, ILogger<GameSessionAnswerRepository> logger)
    {
        _container = cosmosDbService.GameSessionAnswersContainer;
        _logger = logger;
    }

    public async Task<GameSessionAnswer> CreateAsync(GameSessionAnswer answer)
    {
        try
        {
            answer.Timestamp = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(answer, new PartitionKey(answer.UserId));
            _logger.LogInformation("Created answer record {AnswerId} for session {SessionId}", answer.Id, answer.SessionId);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating answer for session {SessionId}", answer.SessionId);
            throw;
        }
    }

    public async Task<List<GameSessionAnswer>> GetBySessionIdAsync(string sessionId, string? userId)
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.sessionId = @sessionId ORDER BY c.timestamp ASC")
                .WithParameter("@sessionId", sessionId);
            
            var iterator = _container.GetItemQueryIterator<GameSessionAnswer>(query);
            
            var answers = new List<GameSessionAnswer>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                answers.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} answers for session {SessionId}", answers.Count, sessionId);
            return answers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving answers for session {SessionId}", sessionId);
            throw;
        }
    }
}
