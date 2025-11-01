using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace IQChallenge.Api.Models.Dtos.Telemetry;

/// <summary>
/// Payload for recording telemetry track events
/// </summary>
public class TelemetryTrackRequest
{
    /// <summary>
    /// Category of the telemetry event (e.g., user, game, system)
    /// </summary>
    [Required]
    [MinLength(1)]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Specific event name (e.g., game.started, question.answered)
    /// </summary>
    [Required]
    [MinLength(1)]
    public string Event { get; set; } = string.Empty;

    /// <summary>
    /// Optional user identifier associated with the event
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// Event timestamp supplied by the client (falls back to server time when null)
    /// </summary>
    public DateTimeOffset? Timestamp { get; set; }

    /// <summary>
    /// Additional event-specific data
    /// </summary>
    public Dictionary<string, JsonElement>? Properties { get; set; }

    /// <summary>
    /// Supplemental context about the environment or device
    /// </summary>
    public Dictionary<string, JsonElement>? Context { get; set; }
}
