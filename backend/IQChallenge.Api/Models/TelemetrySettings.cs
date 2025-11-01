using System.ComponentModel.DataAnnotations;

namespace IQChallenge.Api.Models;

/// <summary>
/// Configuration settings for telemetry Event Hub integration
/// </summary>
public class TelemetrySettings
{
    /// <summary>
    /// Indicates whether telemetry forwarding is enabled
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Azure Event Hub connection string
    /// </summary>
    [Required]
    [MinLength(1)]
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Azure Event Hub name
    /// </summary>
    [Required]
    [MinLength(1)]
    public string? EventHubName { get; set; }

    /// <summary>
    /// Validates the telemetry configuration
    /// </summary>
    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        var validationContext = new ValidationContext(this);
        Validator.ValidateObject(this, validationContext, validateAllProperties: true);

        if (string.IsNullOrWhiteSpace(ConnectionString))
        {
            throw new ValidationException("Telemetry:ConnectionString cannot be empty when telemetry is enabled.");
        }

        if (string.IsNullOrWhiteSpace(EventHubName))
        {
            throw new ValidationException("Telemetry:EventHubName cannot be empty when telemetry is enabled.");
        }
    }
}
