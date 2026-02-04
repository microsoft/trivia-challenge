using TriviaChallenge.Api.Models;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Repository interface for GameSessionAnswer operations
/// </summary>
public interface IGameSessionAnswerRepository
{
    Task<GameSessionAnswer> CreateAsync(GameSessionAnswer answer);
    Task<List<GameSessionAnswer>> GetBySessionIdAsync(string sessionId, string? userId);
}
