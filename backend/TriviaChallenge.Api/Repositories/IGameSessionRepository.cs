using TriviaChallenge.Api.Models;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Interface for GameSession repository operations
/// </summary>
public interface IGameSessionRepository
{
    /// <summary>
    /// Gets a session by ID (userId parameter kept for compatibility but not used)
    /// </summary>
    Task<GameSession?> GetByIdAsync(string sessionId, string? userId);

    /// <summary>
    /// Gets all sessions for a user by userId
    /// </summary>
    Task<List<GameSession>> GetByUserIdAsync(string userId);

    /// <summary>
    /// Creates a new session
    /// </summary>
    Task<GameSession> CreateAsync(GameSession session);

    /// <summary>
    /// Updates a session
    /// </summary>
    Task<GameSession> UpdateAsync(GameSession session);

    /// <summary>
    /// Gets top scores for leaderboard
    /// </summary>
    Task<List<GameSession>> GetTopScoresAsync(int count, DateTime? since = null);
}
