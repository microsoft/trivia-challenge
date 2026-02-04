using System.Text.Json.Serialization;

namespace TriviaChallenge.Api.Models;

/// <summary>
/// Represents a player's answer to a specific question in a game session
/// </summary>
public class GameSessionAnswer
{
    /// <summary>
    /// Unique identifier for this answer record
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// User ID (partition key)
    /// </summary>
    [JsonPropertyName("userId")]
    public required string UserId { get; set; }

    /// <summary>
    /// Session ID this answer belongs to
    /// </summary>
    [JsonPropertyName("sessionId")]
    public required string SessionId { get; set; }

    /// <summary>
    /// Question ID that was answered
    /// </summary>
    [JsonPropertyName("questionId")]
    public required string QuestionId { get; set; }

    /// <summary>
    /// Index of the answer chosen by the player (0-3)
    /// </summary>
    [JsonPropertyName("answerIndex")]
    public required int AnswerIndex { get; set; }

    /// <summary>
    /// Whether the answer was correct
    /// </summary>
    [JsonPropertyName("isCorrect")]
    public required bool IsCorrect { get; set; }

    /// <summary>
    /// Points earned for this answer
    /// </summary>
    [JsonPropertyName("pointsEarned")]
    public required int PointsEarned { get; set; }

    /// <summary>
    /// Time elapsed when this answer was submitted (in seconds)
    /// </summary>
    [JsonPropertyName("timeElapsed")]
    public required double TimeElapsed { get; set; }

    /// <summary>
    /// Timestamp when the answer was submitted
    /// </summary>
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
