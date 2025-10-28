using System.Text.Json.Serialization;

namespace IQChallenge.Api.Models;

/// <summary>
/// Represents a randomized draw of questions for a game session
/// </summary>
public class QuestionDraw
{
    /// <summary>
    /// Draw seed value (used as partition key and ID)
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!; // Will be set from seed

    /// <summary>
    /// The seed value used for randomization
    /// </summary>
    [JsonPropertyName("seed")]
    public required int Seed { get; set; }

    /// <summary>
    /// Ordered list of questions with randomized answer choices
    /// </summary>
    [JsonPropertyName("questions")]
    public required List<DrawQuestion> Questions { get; set; }

    /// <summary>
    /// Timestamp when the draw was created
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents a question in a draw with randomized choices
/// </summary>
public class DrawQuestion
{
    /// <summary>
    /// Reference to the original question ID
    /// </summary>
    [JsonPropertyName("questionId")]
    public required string QuestionId { get; set; }

    /// <summary>
    /// The question text
    /// </summary>
    [JsonPropertyName("questionText")]
    public required string QuestionText { get; set; }

    /// <summary>
    /// Randomized answer choices
    /// </summary>
    [JsonPropertyName("choices")]
    public required List<string> Choices { get; set; }

    /// <summary>
    /// Index of the correct answer in the randomized choices
    /// </summary>
    [JsonPropertyName("correctAnswerIndex")]
    public required int CorrectAnswerIndex { get; set; }

    /// <summary>
    /// Category or topic
    /// </summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }
}
