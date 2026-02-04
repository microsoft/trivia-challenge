using TriviaChallenge.Api.Models;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Interface for QuestionDraw repository operations
/// </summary>
public interface IQuestionDrawRepository
{
    /// <summary>
    /// Gets a question draw by sessionId
    /// </summary>
    Task<QuestionDraw?> GetBySessionIdAsync(string sessionId);

    /// <summary>
    /// Creates a new question draw with sessionId as ID
    /// </summary>
    Task<QuestionDraw> CreateAsync(QuestionDraw draw);

    /// <summary>
    /// Creates a question draw from all available questions with a specific seed and sessionId
    /// </summary>
    Task<QuestionDraw> CreateDrawFromQuestionsAsync(string sessionId, string userId, int seed, List<Question> questions);
}
