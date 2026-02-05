using Microsoft.Azure.Cosmos;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Services;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for QuestionPool operations
/// </summary>
public class QuestionPoolRepository : IQuestionPoolRepository
{
    private readonly Container _container;
    private readonly ILogger<QuestionPoolRepository> _logger;

    public QuestionPoolRepository(CosmosDbService cosmosDbService, ILogger<QuestionPoolRepository> logger)
    {
        _container = cosmosDbService.QuestionPoolsContainer;
        _logger = logger;
    }

    public async Task<QuestionPool?> GetByIdAsync(string id)
    {
        try
        {
            var response = await _container.ReadItemAsync<QuestionPool>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("QuestionPool with ID {PoolId} not found", id);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question pool with ID {PoolId}", id);
            throw;
        }
    }

    public async Task<List<QuestionPool>> GetAllAsync()
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.displayOrder ASC");
            var iterator = _container.GetItemQueryIterator<QuestionPool>(query);
            var pools = new List<QuestionPool>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                pools.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} question pools", pools.Count);
            return pools;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all question pools");
            throw;
        }
    }

    public async Task<List<QuestionPool>> GetActivePoolsAsync()
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.isActive = true ORDER BY c.displayOrder ASC");
            var iterator = _container.GetItemQueryIterator<QuestionPool>(query);
            var pools = new List<QuestionPool>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                pools.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} active question pools", pools.Count);
            return pools;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active question pools");
            throw;
        }
    }

    public async Task<QuestionPool> CreateAsync(QuestionPool pool)
    {
        try
        {
            var response = await _container.CreateItemAsync(pool, new PartitionKey(pool.Id));
            _logger.LogInformation("Created question pool with ID {PoolId}", pool.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question pool");
            throw;
        }
    }

    public async Task<QuestionPool> UpsertAsync(QuestionPool pool)
    {
        try
        {
            var response = await _container.UpsertItemAsync(pool, new PartitionKey(pool.Id));
            _logger.LogInformation("Upserted question pool with ID {PoolId}", pool.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting question pool with ID {PoolId}", pool.Id);
            throw;
        }
    }
}
