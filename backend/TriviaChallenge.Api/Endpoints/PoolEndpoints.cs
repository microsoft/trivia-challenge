using Microsoft.AspNetCore.Mvc;
using Asp.Versioning.Builder;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Repositories;

namespace TriviaChallenge.Api.Endpoints;

/// <summary>
/// Question pool management endpoints
/// </summary>
public static class PoolEndpoints
{
    public static IVersionedEndpointRouteBuilder MapPoolEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/pools")
            .WithTags("Pools")
            .WithOpenApi();

        group.MapGet("/", GetAllPools)
            .WithName("GetAllPools")
            .WithSummary("Get all active question pools")
            .Produces<ApiResponse<List<QuestionPool>>>(200)
            .Produces(500);

        group.MapGet("/{id}", GetPoolById)
            .WithName("GetPoolById")
            .WithSummary("Get a question pool by ID (slug)")
            .Produces<ApiResponse<QuestionPool>>(200)
            .Produces(404)
            .Produces(500);

        group.MapPost("/", CreatePool)
            .WithName("CreatePool")
            .WithSummary("Create a new question pool")
            .Produces<ApiResponse<QuestionPool>>(201)
            .Produces(400)
            .Produces(409)
            .Produces(500);

        return builder;
    }

    private static async Task<IResult> GetAllPools(
        IQuestionPoolRepository poolRepository,
        ILogger<Program> logger)
    {
        try
        {
            var pools = await poolRepository.GetActivePoolsAsync();
            return Results.Ok(ApiResponse<List<QuestionPool>>.Ok(pools));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving question pools");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetPoolById(
        string id,
        IQuestionPoolRepository poolRepository,
        ILogger<Program> logger)
    {
        try
        {
            var pool = await poolRepository.GetByIdAsync(id);
            if (pool == null)
            {
                return Results.NotFound(ApiResponse<QuestionPool>.NotFound($"Question pool '{id}' not found"));
            }
            return Results.Ok(ApiResponse<QuestionPool>.Ok(pool));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving question pool {PoolId}", id);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> CreatePool(
        [FromBody] CreatePoolRequest request,
        IQuestionPoolRepository poolRepository,
        ILogger<Program> logger)
    {
        try
        {
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Id))
            {
                return Results.BadRequest(ApiResponse<QuestionPool>.BadRequest("Pool ID (slug) is required"));
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(ApiResponse<QuestionPool>.BadRequest("Pool name is required"));
            }

            // Normalize ID to lowercase slug
            var normalizedId = request.Id.ToLowerInvariant().Trim();

            // Check if pool already exists
            var existingPool = await poolRepository.GetByIdAsync(normalizedId);
            if (existingPool != null)
            {
                return Results.Conflict(ApiResponse<QuestionPool>.Error($"Question pool '{normalizedId}' already exists", 409));
            }

            var pool = new QuestionPool
            {
                Id = normalizedId,
                Name = request.Name.Trim(),
                IconPath = request.IconPath ?? $"/pools/{normalizedId}.svg",
                Description = request.Description,
                IsActive = request.IsActive ?? true,
                DisplayOrder = request.DisplayOrder ?? 0
            };

            var createdPool = await poolRepository.CreateAsync(pool);
            logger.LogInformation("Created question pool {PoolId}", createdPool.Id);

            return Results.Created($"/api/v1.0/pools/{createdPool.Id}", ApiResponse<QuestionPool>.Created(createdPool));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating question pool");
            return Results.StatusCode(500);
        }
    }
}

/// <summary>
/// Request to create a new question pool
/// </summary>
public class CreatePoolRequest
{
    /// <summary>
    /// Unique ID (slug) for the pool, e.g., "ignite-2026"
    /// </summary>
    public required string Id { get; set; }

    /// <summary>
    /// Display name for the pool
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Path to the pool's icon (defaults to /pools/{id}.svg)
    /// </summary>
    public string? IconPath { get; set; }

    /// <summary>
    /// Optional description of the pool
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether the pool is active (defaults to true)
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Display order for sorting (defaults to 0)
    /// </summary>
    public int? DisplayOrder { get; set; }
}
