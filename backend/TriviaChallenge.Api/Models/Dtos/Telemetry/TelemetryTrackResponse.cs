namespace TriviaChallenge.Api.Models.Dtos.Telemetry;

/// <summary>
/// Response returned after processing a telemetry track request
/// </summary>
public class TelemetryTrackResponse
{
    /// <summary>
    /// Identifier assigned to the telemetry event (empty when telemetry is disabled)
    /// </summary>
    public string EventId { get; set; } = string.Empty;

    /// <summary>
    /// Server-side timestamp when the event was processed
    /// </summary>
    public DateTimeOffset ProcessedAtUtc { get; set; }

    /// <summary>
    /// Indicates whether the event was forwarded to the configured backend
    /// </summary>
    public bool Forwarded { get; set; }

    /// <summary>
    /// Optional informational message about the processing result
    /// </summary>
    public string? Message { get; set; }
}
