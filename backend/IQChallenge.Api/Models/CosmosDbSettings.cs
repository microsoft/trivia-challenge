namespace IQChallenge.Api.Models;

/// <summary>
/// Configuration settings for Azure Cosmos DB
/// </summary>
public class CosmosDbSettings
{
    /// <summary>
    /// Cosmos DB endpoint URI
    /// </summary>
    public required string EndpointUri { get; set; }

    /// <summary>
    /// Cosmos DB primary key for authentication
    /// </summary>
    public required string PrimaryKey { get; set; }

    /// <summary>
    /// Name of the Cosmos DB database
    /// </summary>
    public required string DatabaseName { get; set; }

    /// <summary>
    /// Name of the Users container
    /// </summary>
    public required string UsersContainerName { get; set; }

    /// <summary>
    /// Name of the Questions container
    /// </summary>
    public required string QuestionsContainerName { get; set; }

    /// <summary>
    /// Name of the QuestionDraws container
    /// </summary>
    public required string QuestionDrawsContainerName { get; set; }

    /// <summary>
    /// Name of the GameSessions container
    /// </summary>
    public required string GameSessionsContainerName { get; set; }
}
