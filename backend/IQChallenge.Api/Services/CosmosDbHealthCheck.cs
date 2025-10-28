using Microsoft.Extensions.Diagnostics.HealthChecks;
using IQChallenge.Api.Models;

namespace IQChallenge.Api.Services;

/// <summary>
/// Health check for Azure Cosmos DB connectivity
/// </summary>
public class CosmosDbHealthCheck : IHealthCheck
{
    private readonly CosmosDbService _cosmosDbService;
    private readonly ILogger<CosmosDbHealthCheck> _logger;

    public CosmosDbHealthCheck(CosmosDbService cosmosDbService, ILogger<CosmosDbHealthCheck> logger)
    {
        _cosmosDbService = cosmosDbService;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Attempt a simple read operation to verify connectivity
            await _cosmosDbService.GetDatabaseAsync(cancellationToken);
            
            return HealthCheckResult.Healthy("Cosmos DB is accessible");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cosmos DB health check failed");
            return HealthCheckResult.Unhealthy(
                "Cosmos DB is not accessible", 
                ex);
        }
    }
}
