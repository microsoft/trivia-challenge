using System.Text.Json.Serialization;

namespace IQChallenge.Api.Models;

/// <summary>
/// Represents a quiz question with multiple choice answers
/// </summary>
public class Question
{
    /// <summary>
    /// Unique identifier for the question (used as partition key)
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Category or topic of the question
    /// </summary>
    [JsonPropertyName("category")]
    public required string Category { get; set; }

    /// <summary>
    /// The question text
    /// </summary>
    [JsonPropertyName("question")]
    public required string QuestionText { get; set; }

    /// <summary>
    /// Four possible answer choices
    /// </summary>
    [JsonPropertyName("answers")]
    public required List<string> Answers { get; set; }

    /// <summary>
    /// The key/index (0-3) of the correct answer in the Answers list
    /// </summary>
    [JsonPropertyName("correctAnswerKey")]
    public required int CorrectAnswerKey { get; set; }

    /// <summary>
    /// Additional metadata about the question
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }

    /// <summary>
    /// Timestamp when the question was created
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
