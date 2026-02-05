using TriviaChallenge.Api.Models;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Interface for QuestionPool repository operations
/// </summary>
public interface IQuestionPoolRepository
{
    /// <summary>
    /// Gets a question pool by ID (slug)
    /// </summary>
    Task<QuestionPool?> GetByIdAsync(string id);

    /// <summary>
    /// Gets all question pools
    /// </summary>
    Task<List<QuestionPool>> GetAllAsync();

    /// <summary>
    /// Gets all active question pools ordered by display order
    /// </summary>
    Task<List<QuestionPool>> GetActivePoolsAsync();

    /// <summary>
    /// Creates a new question pool
    /// </summary>
    Task<QuestionPool> CreateAsync(QuestionPool pool);

    /// <summary>
    /// Creates or updates a question pool (upsert)
    /// </summary>
    Task<QuestionPool> UpsertAsync(QuestionPool pool);
}
