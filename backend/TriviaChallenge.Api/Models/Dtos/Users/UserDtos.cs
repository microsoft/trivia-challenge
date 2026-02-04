using System.ComponentModel.DataAnnotations;

namespace TriviaChallenge.Api.Models.Dtos.Users;

/// <summary>
/// Request to register or login a user
/// </summary>
public class RegisterUserRequest
{
    /// <summary>
    /// User's email address (unique identifier)
    /// </summary>
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public required string Email { get; set; }

    /// <summary>
    /// User's display name
    /// </summary>
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters")]
    public required string Name { get; set; }

    /// <summary>
    /// User's phone number
    /// </summary>
    [Phone(ErrorMessage = "Invalid phone number format")]
    public required string PhoneNumber { get; set; }
}

/// <summary>
/// Response containing user information
/// </summary>
public class UserResponse
{
    public required string UserId { get; set; }
    public required string Email { get; set; }
    public required string Name { get; set; }
    public required string PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}
