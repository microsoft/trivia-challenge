using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models.Dtos.Sessions;

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
}
