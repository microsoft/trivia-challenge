using IQChallenge.Api.Models.Dtos.Telemetry;

namespace IQChallenge.Api.Services;

/// <summary>
/// Telemetry service used when telemetry forwarding is disabled
/// </summary>
public class NoOpTelemetryService : ITelemetryService
{
    private readonly ILogger<NoOpTelemetryService> _logger;

    public NoOpTelemetryService(ILogger<NoOpTelemetryService> logger)
    {
        _logger = logger;
        _logger.LogWarning("Telemetry forwarding is disabled. Events will be acknowledged without forwarding.");
    }

    /// <inheritdoc />
    public Task<TelemetryResult> TrackAsync(TelemetryTrackRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug(
            "Telemetry disabled - received event {EventName} of type {Type} for user {UserId}",
            request.Event,
            request.Type,
            request.UserId ?? "anonymous");

        return Task.FromResult(TelemetryResult.Disabled("Telemetry forwarding is disabled."));
    }
}
