using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Request to end a game session
/// </summary>
public class EndSessionRequest
{
    /// <summary>
    /// Number of questions answered
    /// </summary>
    [Required]
    public required int QuestionsAnswered { get; set; }

    /// <summary>
    /// Number of correct answers
    /// </summary>
    [Required]
    public required int CorrectAnswers { get; set; }

    /// <summary>
    /// Number of streaks completed (each streak = 5 correct answers)
    /// </summary>
    [Required]
    public required int StreaksCompleted { get; set; }

    /// <summary>
    /// Final time remaining when game ended (in seconds)
    /// </summary>
    [Required]
    public required double FinalTimeRemaining { get; set; }

    /// <summary>
    /// Hearts remaining when the session ended (supports half-heart increments)
    /// </summary>
    [Required]
    public required double HeartsRemaining { get; set; }

    /// <summary>
    /// Optional code describing why the session ended early (e.g., hearts depleted)
    /// </summary>
    public string? GameOverReason { get; set; }
}
