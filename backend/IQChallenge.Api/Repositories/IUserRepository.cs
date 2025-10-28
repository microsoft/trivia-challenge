using IQChallenge.Api.Models;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Interface for User repository operations
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user by email
    /// </summary>
    Task<User?> GetByEmailAsync(string email);

    /// <summary>
    /// Creates a new user or returns existing user
    /// </summary>
    Task<User> CreateOrGetAsync(User user);

    /// <summary>
    /// Updates a user
    /// </summary>
    Task<User> UpdateAsync(User user);
}
