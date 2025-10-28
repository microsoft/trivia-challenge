using System.Text.Json.Serialization;

namespace IQChallenge.Api.Models;

/// <summary>
/// Represents a quiz question with answer pair
/// </summary>
public class Question
{
    /// <summary>
    /// Unique identifier for the question (used as partition key)
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// The question text
    /// </summary>
    [JsonPropertyName("question")]
    public required string QuestionText { get; set; }

    /// <summary>
    /// The correct answer text
    /// </summary>
    [JsonPropertyName("answer")]
    public required string Answer { get; set; }

    /// <summary>
    /// Category or topic of the question
    /// </summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>
    /// Timestamp when the question was created
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
