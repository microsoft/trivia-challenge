using System.Text.Json.Serialization;

namespace TriviaChallenge.Api.Models;

/// <summary>
/// Represents a user's game session
/// </summary>
public class GameSession
{
    /// <summary>
    /// Unique identifier for the session (GUID)
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// User ID (foreign key to User, partition key)
    /// </summary>
    [JsonPropertyName("userId")]
    public required string UserId { get; set; }

    /// <summary>
    /// Draw seed value for question randomization
    /// </summary>
    [JsonPropertyName("seed")]
    public required int Seed { get; set; }

    /// <summary>
    /// Current game status: active, completed, abandoned
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    /// <summary>
    /// Timestamp when the session was started
    /// </summary>
    [JsonPropertyName("startTime")]
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the session ended
    /// </summary>
    [JsonPropertyName("endTime")]
    public DateTime? EndTime { get; set; }

    /// <summary>
    /// Total score accumulated during the session
    /// </summary>
    [JsonPropertyName("totalScore")]
    public int TotalScore { get; set; } = 0;

    /// <summary>
    /// Number of questions answered by the player
    /// </summary>
    [JsonPropertyName("questionsAnswered")]
    public int QuestionsAnswered { get; set; } = 0;

    /// <summary>
    /// Number of correct answers
    /// </summary>
    [JsonPropertyName("correctAnswers")]
    public int CorrectAnswers { get; set; } = 0;

    /// <summary>
    /// Number of streaks completed (5 correct answers each)
    /// </summary>
    [JsonPropertyName("streaksCompleted")]
    public int StreaksCompleted { get; set; } = 0;

    /// <summary>
    /// Remaining hearts for the session (supports half-heart increments)
    /// </summary>
    [JsonPropertyName("heartsRemaining")]
    public double HeartsRemaining { get; set; } = 5;

    /// <summary>
    /// Optional code describing how the session ended (e.g., hearts depleted)
    /// </summary>
    [JsonPropertyName("gameOverReason")]
    public string? GameOverReason { get; set; }

    /// <summary>
    /// Timestamp when the session was created
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last updated timestamp
    /// </summary>
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
