using System.ComponentModel.DataAnnotations;

namespace TriviaChallenge.Api.Models.Dtos.Sessions;

/// <summary>
/// Request to start a new game session
/// </summary>
public class StartSessionRequest
{
    /// <summary>
    /// User ID who is starting the session
    /// </summary>
    [Required(ErrorMessage = "UserId is required")]
    public required string UserId { get; set; }

    /// <summary>
    /// Optional question pool ID (slug) to use for the session. Defaults to "default" if not provided.
    /// </summary>
    public string? PoolId { get; set; }
}
