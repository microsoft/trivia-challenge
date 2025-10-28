namespace IQChallenge.Api.Services;

/// <summary>
/// Background service to initialize Cosmos DB without blocking application startup
/// </summary>
public class DatabaseInitializationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseInitializationService> _logger;

    public DatabaseInitializationService(
        IServiceProvider serviceProvider,
        ILogger<DatabaseInitializationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Starting database initialization...");

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var cosmosDbService = scope.ServiceProvider.GetRequiredService<CosmosDbService>();
            
            await cosmosDbService.InitializeDatabaseAsync();
            
            _logger.LogInformation("Database initialization completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database initialization failed. Application will continue but may not function correctly.");
        }
    }
}
