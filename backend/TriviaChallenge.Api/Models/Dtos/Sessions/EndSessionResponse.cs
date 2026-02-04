namespace TriviaChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Response containing final game session results
/// </summary>
public class EndSessionResponse
{
    public required string SessionId { get; set; }
    public required int FinalScore { get; set; }
    public required int QuestionsAnswered { get; set; }
    public required int CorrectAnswers { get; set; }
    public required double Accuracy { get; set; }
    public required int StreaksCompleted { get; set; }
    public required double HeartsRemaining { get; set; }
    public string? GameOverReason { get; set; }
}
