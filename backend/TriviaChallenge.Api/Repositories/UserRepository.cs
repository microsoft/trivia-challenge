using Microsoft.Azure.Cosmos;
using TriviaChallenge.Api.Services;
using UserModel = TriviaChallenge.Api.Models.User;

namespace TriviaChallenge.Api.Repositories;

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
            var query = new QueryDefinition("SELECT * FROM c WHERE c.email = @email")
                .WithParameter("@email", email.ToLowerInvariant());
            
            var iterator = _container.GetItemQueryIterator<UserModel>(query);
            
            if (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                return response.FirstOrDefault();
            }
            
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
            // Normalize email to lowercase
            user.Email = user.Email.ToLowerInvariant();
            
            // Try to get existing user first by email
            var existingUser = await GetByEmailAsync(user.Email);
            if (existingUser != null)
            {
                _logger.LogInformation("User with email {Email} already exists with ID {UserId}", user.Email, existingUser.Id);
                return existingUser;
            }

            // Create new user with GUID
            user.Id = Guid.NewGuid().ToString();
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(user, new PartitionKey(user.Id));
            _logger.LogInformation("Created new user with ID {UserId} and email {Email}", user.Id, user.Email);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating or getting user with email {Email}", user.Email);
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
            
            _logger.LogInformation("Updated user with ID {UserId}", user.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user with ID {UserId}", user.Id);
            throw;
        }
    }
}
