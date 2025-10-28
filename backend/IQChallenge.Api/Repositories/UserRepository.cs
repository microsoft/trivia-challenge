using Microsoft.Azure.Cosmos;
using IQChallenge.Api.Services;
using UserModel = IQChallenge.Api.Models.User;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for User operations
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly Container _container;
    private readonly ILogger<UserRepository> _logger;

    public UserRepository(CosmosDbService cosmosDbService, ILogger<UserRepository> logger)
    {
        _container = cosmosDbService.UsersContainer;
        _logger = logger;
    }

    public async Task<UserModel?> GetByEmailAsync(string email)
    {
        try
        {
            var response = await _container.ReadItemAsync<UserModel>(email, new PartitionKey(email));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogInformation("User with email {Email} not found", email);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user with email {Email}", email);
            throw;
        }
    }

    public async Task<UserModel> CreateOrGetAsync(UserModel user)
    {
        try
        {
            // Try to get existing user first
            var existingUser = await GetByEmailAsync(user.Id);
            if (existingUser != null)
            {
                _logger.LogInformation("User with email {Email} already exists", user.Id);
                return existingUser;
            }

            // Create new user
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(user, new PartitionKey(user.Id));
            _logger.LogInformation("Created new user with email {Email}", user.Id);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating or getting user with email {Email}", user.Id);
            throw;
        }
    }

    public async Task<UserModel> UpdateAsync(UserModel user)
    {
        try
        {
            user.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.ReplaceItemAsync(
                user,
                user.Id,
                new PartitionKey(user.Id));
            
            _logger.LogInformation("Updated user with email {Email}", user.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user with email {Email}", user.Id);
            throw;
        }
    }
}
