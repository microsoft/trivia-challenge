using System.ComponentModel.DataAnnotations;

namespace TriviaChallenge.Api.Models.Dtos.Users;

/// <summary>
/// Request to register or login a user
/// </summary>
public class RegisterUserRequest : IValidatableObject
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

    /// <summary>
    /// User's country (required unless state is provided)
    /// </summary>
    [StringLength(100, ErrorMessage = "Country must be 100 characters or fewer")]
    public string? Country { get; set; }

    /// <summary>
    /// User's state (required when country is omitted)
    /// </summary>
    [StringLength(100, ErrorMessage = "State must be 100 characters or fewer")]
    public string? State { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var hasCountry = !string.IsNullOrWhiteSpace(Country);
        var hasState = !string.IsNullOrWhiteSpace(State);

        if (!hasCountry && !hasState)
        {
            yield return new ValidationResult(
                "Country or state is required",
                new[] { nameof(Country), nameof(State) });
        }

        if (hasCountry && hasState)
        {
            yield return new ValidationResult(
                "Provide either country or state, not both",
                new[] { nameof(Country), nameof(State) });
        }
    }
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
    public string? Country { get; set; }
    public string? State { get; set; }
    public DateTime CreatedAt { get; set; }
}
