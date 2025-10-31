namespace IQChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// A single question in a session with shuffled answers
/// </summary>
public class SessionQuestionDto
{
    public required string QuestionId { get; set; }
    public required string QuestionText { get; set; }
    public required string Category { get; set; }
    public required List<string> Choices { get; set; }
    public required int CorrectAnswerIndex { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}
