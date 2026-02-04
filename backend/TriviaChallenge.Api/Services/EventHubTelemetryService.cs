using System.Text;
using System.Text.Json;
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Producer;
using TriviaChallenge.Api.Models.Dtos.Telemetry;

namespace TriviaChallenge.Api.Services;

/// <summary>
/// Telemetry service that forwards events to Azure Event Hubs
/// </summary>
public class EventHubTelemetryService : ITelemetryService
{
    private readonly EventHubProducerClient _eventHubClient;
    private readonly ILogger<EventHubTelemetryService> _logger;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public EventHubTelemetryService(EventHubProducerClient eventHubClient, ILogger<EventHubTelemetryService> logger)
    {
        _eventHubClient = eventHubClient;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TelemetryResult> TrackAsync(TelemetryTrackRequest request, CancellationToken cancellationToken = default)
    {
        var eventId = Guid.NewGuid().ToString("N");
        var timestamp = request.Timestamp ?? DateTimeOffset.UtcNow;

        var payload = new
        {
            eventId,
            eventType = "track",
            type = request.Type,
            eventName = request.Event,
            userId = request.UserId,
            timestamp,
            properties = request.Properties,
            context = request.Context,
            ingestedAtUtc = DateTimeOffset.UtcNow
        };

        try
        {
            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var batch = await _eventHubClient.CreateBatchAsync(cancellationToken);

            if (!batch.TryAdd(new EventData(Encoding.UTF8.GetBytes(json))))
            {
                _logger.LogWarning("Telemetry payload is too large to be added to the Event Hub batch for event {EventName}", request.Event);
                return TelemetryResult.Failure("Telemetry payload exceeds maximum size for Event Hub batch.");
            }

            await _eventHubClient.SendAsync(batch, cancellationToken);

            _logger.LogInformation(
                "Telemetry event forwarded to Event Hub {EventHubName}: {EventName} ({EventId})",
                _eventHubClient.EventHubName,
                request.Event,
                eventId);

            return TelemetryResult.ForwardedSuccess(eventId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to forward telemetry event {EventName} to Event Hub", request.Event);
            return TelemetryResult.Failure("Failed to forward telemetry event to Event Hub.");
        }
    }
}
