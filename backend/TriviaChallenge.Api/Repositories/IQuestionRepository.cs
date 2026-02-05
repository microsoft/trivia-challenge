using TriviaChallenge.Api.Models;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Interface for Question repository operations
/// </summary>
public interface IQuestionRepository
{
    /// <summary>
    /// Gets a question by ID
    /// </summary>
    Task<Question?> GetByIdAsync(string id);

    /// <summary>
    /// Gets all questions
    /// </summary>
    Task<List<Question>> GetAllAsync();

    /// <summary>
    /// Gets all questions belonging to a specific pool
    /// </summary>
    /// <param name="poolId">The pool slug to filter by</param>
    Task<List<Question>> GetByPoolAsync(string poolId);

    /// <summary>
    /// Creates a new question
    /// </summary>
    Task<Question> CreateAsync(Question question);

    /// <summary>
    /// Creates multiple questions
    /// </summary>
    Task<List<Question>> CreateManyAsync(List<Question> questions);

    /// <summary>
    /// Updates a question
    /// </summary>
    Task<Question> UpdateAsync(Question question);

    /// <summary>
    /// Deletes a question
    /// </summary>
    Task<bool> DeleteAsync(string id);
}
