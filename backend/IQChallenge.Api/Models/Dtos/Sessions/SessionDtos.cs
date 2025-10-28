using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Request to create a new game session
/// </summary>
public class CreateSessionRequest
{
    /// <summary>
    /// User email
    /// </summary>
    [Required(ErrorMessage = "User email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public required string UserEmail { get; set; }

    /// <summary>
    /// Optional draw seed (if null, a new random draw will be created)
    /// </summary>
    public int? DrawSeed { get; set; }
}

/// <summary>
/// Request to complete a game session with results
/// </summary>
public class CompleteSessionRequest
{
    /// <summary>
    /// Total score achieved
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Score must be non-negative")]
    public required int TotalScore { get; set; }

    /// <summary>
    /// Maximum streak achieved
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Max streak must be non-negative")]
    public required int MaxStreak { get; set; }

    /// <summary>
    /// Number of correct answers
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Correct answers must be non-negative")]
    public required int CorrectAnswers { get; set; }

    /// <summary>
    /// Number of incorrect answers
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Incorrect answers must be non-negative")]
    public required int IncorrectAnswers { get; set; }
}

/// <summary>
/// Response containing session information
/// </summary>
public class SessionResponse
{
    public required string SessionId { get; set; }
    public required string UserEmail { get; set; }
    public required int DrawSeed { get; set; }
    public required string Status { get; set; }
    public int TotalScore { get; set; }
    public int MaxStreak { get; set; }
    public int CorrectAnswers { get; set; }
    public int IncorrectAnswers { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
