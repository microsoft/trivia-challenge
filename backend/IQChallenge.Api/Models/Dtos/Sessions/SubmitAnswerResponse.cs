namespace IQChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Response after submitting an answer
/// </summary>
public class SubmitAnswerResponse
{
    public required int PointsEarned { get; set; }
    public required int TotalScore { get; set; }
}
