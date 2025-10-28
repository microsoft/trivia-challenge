using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models.Dtos.Questions;

/// <summary>
/// Request to upload questions
/// </summary>
public class UploadQuestionsRequest
{
    [Required(ErrorMessage = "Questions JSON is required")]
    public required string QuestionsJson { get; set; }
}

/// <summary>
/// Response containing a question draw
/// </summary>
public class QuestionDrawResponse
{
    public required int Seed { get; set; }
    public required List<DrawQuestionResponse> Questions { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response containing a single question in a draw
/// </summary>
public class DrawQuestionResponse
{
    public required string QuestionId { get; set; }
    public required string QuestionText { get; set; }
    public required List<string> Choices { get; set; }
    public required int CorrectAnswerIndex { get; set; }
    public string? Category { get; set; }
}
