using IQChallenge.Api.Models;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Interface for QuestionDraw repository operations
/// </summary>
public interface IQuestionDrawRepository
{
    /// <summary>
    /// Gets a question draw by seed
    /// </summary>
    Task<QuestionDraw?> GetBySeedAsync(int seed);

    /// <summary>
    /// Creates a new question draw
    /// </summary>
    Task<QuestionDraw> CreateAsync(QuestionDraw draw);

    /// <summary>
    /// Creates a question draw from all available questions with a specific seed
    /// </summary>
    Task<QuestionDraw> CreateDrawFromQuestionsAsync(int seed, List<Question> questions);
}
