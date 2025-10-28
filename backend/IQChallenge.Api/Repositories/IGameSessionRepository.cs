using IQChallenge.Api.Models;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Interface for GameSession repository operations
/// </summary>
public interface IGameSessionRepository
{
    /// <summary>
    /// Gets a session by ID
    /// </summary>
    Task<GameSession?> GetByIdAsync(string sessionId);

    /// <summary>
    /// Gets all sessions for a user by email
    /// </summary>
    Task<List<GameSession>> GetByUserEmailAsync(string userEmail);

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
