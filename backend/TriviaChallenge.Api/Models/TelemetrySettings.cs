using System.ComponentModel.DataAnnotations;

namespace TriviaChallenge.Api.Models;

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
    /// Azure Event Hub connection string (for key-based authentication).
    /// When provided, key authentication will be used.
    /// </summary>
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Azure Event Hub fully qualified namespace (e.g., "mynamespace.servicebus.windows.net").
    /// Used for Managed Identity authentication when ConnectionString is not provided.
    /// </summary>
    public string? FullyQualifiedNamespace { get; set; }

    /// <summary>
    /// Azure Event Hub name
    /// </summary>
    [Required]
    [MinLength(1)]
    public string? EventHubName { get; set; }

    /// <summary>
    /// Returns true if key-based authentication should be used (ConnectionString is provided)
    /// </summary>
    public bool UseKeyAuthentication => !string.IsNullOrWhiteSpace(ConnectionString);

    /// <summary>
    /// Validates the telemetry configuration
    /// </summary>
    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(EventHubName))
        {
            throw new ValidationException("Telemetry:EventHubName cannot be empty when telemetry is enabled.");
        }

        // Either ConnectionString or FullyQualifiedNamespace must be provided
        if (string.IsNullOrWhiteSpace(ConnectionString) && string.IsNullOrWhiteSpace(FullyQualifiedNamespace))
        {
            throw new ValidationException(
                "Either Telemetry:ConnectionString (for key authentication) or Telemetry:FullyQualifiedNamespace (for Managed Identity) must be provided when telemetry is enabled.");
        }
    }
}
