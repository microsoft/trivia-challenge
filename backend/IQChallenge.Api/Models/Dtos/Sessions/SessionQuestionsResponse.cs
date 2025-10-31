namespace IQChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Response containing all questions for a session
/// </summary>
public class SessionQuestionsResponse
{
    public required List<SessionQuestionDto> Questions { get; set; }
}
