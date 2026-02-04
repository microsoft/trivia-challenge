using System.ComponentModel.DataAnnotations;

namespace TriviaChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Request to submit an answer for a question
/// </summary>
public class SubmitAnswerRequest
{
    /// <summary>
    /// ID of the question being answered
    /// </summary>
    [Required(ErrorMessage = "QuestionId is required")]
    public required string QuestionId { get; set; }

    /// <summary>
    /// Index of the selected answer (0-3)
    /// </summary>
    [Required]
    [Range(0, 3, ErrorMessage = "AnswerIndex must be between 0 and 3")]
    public required int AnswerIndex { get; set; }

    /// <summary>
    /// Time elapsed when answer was submitted (in seconds)
    /// </summary>
    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "TimeElapsed must be non-negative")]
    public required double TimeElapsed { get; set; }

    /// <summary>
    /// Whether the answer was correct (validated on frontend)
    /// </summary>
    [Required]
    public required bool IsCorrect { get; set; }
}
