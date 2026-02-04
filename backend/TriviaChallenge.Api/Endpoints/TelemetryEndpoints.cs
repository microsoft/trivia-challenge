using System.Text.Json;
using Asp.Versioning.Builder;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Models.Dtos.Telemetry;
using TriviaChallenge.Api.Services;
using Microsoft.AspNetCore.Http;

namespace TriviaChallenge.Api.Endpoints;

/// <summary>
/// Telemetry-related endpoints
/// </summary>
public static class TelemetryEndpoints
{
    private static readonly JsonSerializerOptions LogSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Maps telemetry endpoints.
    /// </summary>
    public static IVersionedEndpointRouteBuilder MapTelemetryEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/telemetry")
            .WithTags("Telemetry")
            .WithOpenApi();

        group.MapPost("/track", TrackTelemetryAsync)
            .WithName("TrackTelemetry")
            .WithSummary("Record a telemetry event and forward it to the analytics pipeline")
            .Produces<ApiResponse<TelemetryTrackResponse>>(200)
            .Produces<ApiResponse<object>>(400)
            .Produces<ApiResponse<object>>(500);

        return builder;
    }

    private static async Task<IResult> TrackTelemetryAsync(
        TelemetryTrackRequest request,
        ITelemetryService telemetryService,
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return Results.BadRequest(ApiResponse<object>.BadRequest("Telemetry payload is required."));
        }

        var validationErrors = Validate(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(ApiResponse<object>.BadRequest(string.Join(" | ", validationErrors)));
        }

        request.Timestamp ??= DateTimeOffset.UtcNow;

        try
        {
            var propertiesJson = request.Properties is { Count: > 0 }
                ? JsonSerializer.Serialize(request.Properties, LogSerializerOptions)
                : "{}";

            var contextJson = request.Context is { Count: > 0 }
                ? JsonSerializer.Serialize(request.Context, LogSerializerOptions)
                : "{}";

            logger.LogInformation(
                "Telemetry event received: {Type}::{EventName} for user {UserId} at {Timestamp} | Properties: {Properties} | Context: {Context}",
                request.Type,
                request.Event,
                request.UserId ?? "anonymous",
                request.Timestamp,
                propertiesJson,
                contextJson);

            var result = await telemetryService.TrackAsync(request, cancellationToken);

            if (!result.Success)
            {
                logger.LogError(
                    "Telemetry forwarding failed for event {EventName}: {Message}",
                    request.Event,
                    result.Message ?? "unknown error");

                return Results.Json(
                    ApiResponse<object>.Error(result.Message ?? "Telemetry forwarding failed."),
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            var response = new TelemetryTrackResponse
            {
                EventId = result.EventId ?? string.Empty,
                ProcessedAtUtc = DateTimeOffset.UtcNow,
                Forwarded = result.Forwarded,
                Message = result.Message
            };

            return Results.Ok(ApiResponse<TelemetryTrackResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error processing telemetry event {EventName}", request.Event);
            return Results.Json(
                ApiResponse<object>.Error("Unexpected error processing telemetry event."),
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static List<string> Validate(TelemetryTrackRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Type))
        {
            errors.Add("Type is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Event))
        {
            errors.Add("Event is required.");
        }

        if (request.Timestamp is { } timestamp && timestamp > DateTimeOffset.UtcNow.AddMinutes(5))
        {
            errors.Add("Timestamp cannot be more than 5 minutes in the future.");
        }

        return errors;
    }
}
