using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models;

/// <summary>
/// Configuration settings for Azure Cosmos DB
/// </summary>
public class CosmosDbSettings
{
    /// <summary>
    /// Cosmos DB endpoint URI
    /// </summary>
    [Required]
    [Url]
    public required string EndpointUri { get; set; }

    /// <summary>
    /// Cosmos DB primary key for authentication
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string PrimaryKey { get; set; }

    /// <summary>
    /// Name of the Cosmos DB database
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string DatabaseName { get; set; }

    /// <summary>
    /// Name of the Users container
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string UsersContainerName { get; set; }

    /// <summary>
    /// Name of the Questions container
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string QuestionsContainerName { get; set; }

    /// <summary>
    /// Name of the QuestionDraws container
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string QuestionDrawsContainerName { get; set; }

    /// <summary>
    /// Name of the GameSessions container
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string GameSessionsContainerName { get; set; }

    /// <summary>
    /// Maximum retry attempts on rate limited requests
    /// </summary>
    [Range(0, 10)]
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>
    /// Maximum retry wait time on rate limited requests (in seconds)
    /// </summary>
    [Range(1, 60)]
    public int MaxRetryWaitTimeSeconds { get; set; } = 10;

    /// <summary>
    /// Validates the settings
    /// </summary>
    public void Validate()
    {
        var validationContext = new ValidationContext(this);
        Validator.ValidateObject(this, validationContext, validateAllProperties: true);

        // Additional URI validation
        if (!Uri.TryCreate(EndpointUri, UriKind.Absolute, out _))
        {
            throw new ValidationException($"EndpointUri '{EndpointUri}' is not a valid URI");
        }
    }
}
