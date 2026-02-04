using TriviaChallenge.Api.Models.Dtos.Telemetry;

namespace TriviaChallenge.Api.Services;

/// <summary>
/// Contract for forwarding telemetry events to downstream services
/// </summary>
public interface ITelemetryService
{
    /// <summary>
    /// Sends a telemetry track event
    /// </summary>
    /// <param name="request">The telemetry payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Operation result.</returns>
    Task<TelemetryResult> TrackAsync(TelemetryTrackRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Result returned by telemetry service implementations
/// </summary>
/// <param name="Success">Indicates whether the request was processed successfully.</param>
/// <param name="EventId">Event identifier when available.</param>
/// <param name="Message">Additional context on the operation outcome.</param>
/// <param name="Forwarded">True when the payload was forwarded to the downstream target.</param>
public sealed record TelemetryResult(bool Success, string? EventId, string? Message, bool Forwarded)
{
    /// <summary>
    /// Creates a successful result signaling that the payload was forwarded.
    /// </summary>
    public static TelemetryResult ForwardedSuccess(string eventId) => new(true, eventId, null, true);

    /// <summary>
    /// Creates a successful result when telemetry is disabled and nothing was forwarded.
    /// </summary>
    public static TelemetryResult Disabled(string message) => new(true, null, message, false);

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    public static TelemetryResult Failure(string message) => new(false, null, message, false);
}
