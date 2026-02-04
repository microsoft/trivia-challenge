using Asp.Versioning;
using Asp.Versioning.Builder;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Models.Dtos.Users;
using TriviaChallenge.Api.Repositories;

namespace TriviaChallenge.Api.Endpoints;

/// <summary>
/// User-related endpoints
/// </summary>
public static class UserEndpoints
{
    public static IVersionedEndpointRouteBuilder MapUserEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/users")
            .WithTags("Users")
            .WithOpenApi();

        group.MapPost("/register", RegisterUser)
            .WithName("RegisterUser")
            .WithSummary("Register a new user or return existing user")
            .Produces<ApiResponse<UserResponse>>(201)
            .Produces(400)
            .Produces(500);

        return builder;
    }

    private static async Task<IResult> RegisterUser(
        RegisterUserRequest request,
        IUserRepository userRepository,
        ILogger<Program> logger)
    {
        try
        {
            var user = new User
            {
                Email = request.Email,
                Name = request.Name,
                PhoneNumber = request.PhoneNumber,
                Country = string.IsNullOrWhiteSpace(request.Country) ? null : request.Country.Trim(),
                State = string.IsNullOrWhiteSpace(request.State) ? null : request.State.Trim()
            };

            var createdUser = await userRepository.CreateOrGetAsync(user);

            var response = new UserResponse
            {
                UserId = createdUser.Id,
                Email = createdUser.Email,
                Name = createdUser.Name,
                PhoneNumber = createdUser.PhoneNumber,
                Country = createdUser.Country,
                State = createdUser.State,
                CreatedAt = createdUser.CreatedAt
            };

            return Results.Created($"/api/v1.0/users/{createdUser.Id}", ApiResponse<UserResponse>.Created(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error registering user");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetUser(
        string email,
        IUserRepository userRepository,
        ILogger<Program> logger)
    {
        try
        {
            var user = await userRepository.GetByEmailAsync(email.ToLowerInvariant());

            if (user == null)
            {
                return Results.NotFound(ApiResponse<UserResponse>.NotFound("User not found"));
            }

            var response = new UserResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Name = user.Name,
                PhoneNumber = user.PhoneNumber,
                Country = user.Country,
                State = user.State,
                CreatedAt = user.CreatedAt
            };

            return Results.Ok(ApiResponse<UserResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving user {Email}", email);
            return Results.StatusCode(500);
        }
    }
}
