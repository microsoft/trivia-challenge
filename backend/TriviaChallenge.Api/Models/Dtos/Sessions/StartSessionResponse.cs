namespace TriviaChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Response containing session information after starting a game
/// </summary>
public class StartSessionResponse
{
    public required string SessionId { get; set; }
    public required string UserId { get; set; }
    public required int Seed { get; set; }
    public required string QuestionsUrl { get; set; }
    public required DateTime StartTime { get; set; }
    public required string Status { get; set; }
}
