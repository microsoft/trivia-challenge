using System.Text.Json.Serialization;

namespace IQChallenge.Api.Models;

/// <summary>
/// Represents a user's game session
/// </summary>
public class GameSession
{
    /// <summary>
    /// Unique identifier for the session (partition key)
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// User email (foreign key to User)
    /// </summary>
    [JsonPropertyName("userEmail")]
    public required string UserEmail { get; set; }

    /// <summary>
    /// Draw seed value for question randomization
    /// </summary>
    [JsonPropertyName("drawSeed")]
    public required int DrawSeed { get; set; }

    /// <summary>
    /// Timestamp when the session was created
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the game started
    /// </summary>
    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// Timestamp when the game ended
    /// </summary>
    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Current game state
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "created"; // created, active, completed

    /// <summary>
    /// Total score achieved
    /// </summary>
    [JsonPropertyName("totalScore")]
    public int TotalScore { get; set; } = 0;

    /// <summary>
    /// Maximum streak achieved
    /// </summary>
    [JsonPropertyName("maxStreak")]
    public int MaxStreak { get; set; } = 0;

    /// <summary>
    /// Number of correct answers
    /// </summary>
    [JsonPropertyName("correctAnswers")]
    public int CorrectAnswers { get; set; } = 0;

    /// <summary>
    /// Number of incorrect answers
    /// </summary>
    [JsonPropertyName("incorrectAnswers")]
    public int IncorrectAnswers { get; set; } = 0;

    /// <summary>
    /// Last updated timestamp
    /// </summary>
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
