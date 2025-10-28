using Microsoft.Azure.Cosmos;
using IQChallenge.Api.Models;
using IQChallenge.Api.Services;

namespace IQChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for Question operations
/// </summary>
public class QuestionRepository : IQuestionRepository
{
    private readonly Container _container;
    private readonly ILogger<QuestionRepository> _logger;

    public QuestionRepository(CosmosDbService cosmosDbService, ILogger<QuestionRepository> logger)
    {
        _container = cosmosDbService.QuestionsContainer;
        _logger = logger;
    }

    public async Task<Question?> GetByIdAsync(string id)
    {
        try
        {
            var response = await _container.ReadItemAsync<Question>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Question with ID {QuestionId} not found", id);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question with ID {QuestionId}", id);
            throw;
        }
    }

    public async Task<List<Question>> GetAllAsync()
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c");
            var iterator = _container.GetItemQueryIterator<Question>(query);
            var questions = new List<Question>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                questions.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} questions", questions.Count);
            return questions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all questions");
            throw;
        }
    }

    public async Task<Question> CreateAsync(Question question)
    {
        try
        {
            question.CreatedAt = DateTime.UtcNow;
            var response = await _container.CreateItemAsync(question, new PartitionKey(question.Id));
            _logger.LogInformation("Created question with ID {QuestionId}", question.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question");
            throw;
        }
    }

    public async Task<List<Question>> CreateManyAsync(List<Question> questions)
    {
        try
        {
            var createdQuestions = new List<Question>();
            
            foreach (var question in questions)
            {
                question.CreatedAt = DateTime.UtcNow;
                var response = await _container.CreateItemAsync(question, new PartitionKey(question.Id));
                createdQuestions.Add(response.Resource);
            }

            _logger.LogInformation("Created {Count} questions", createdQuestions.Count);
            return createdQuestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating multiple questions");
            throw;
        }
    }

    public async Task<Question> UpdateAsync(Question question)
    {
        try
        {
            var response = await _container.ReplaceItemAsync(
                question, 
                question.Id, 
                new PartitionKey(question.Id));
            
            _logger.LogInformation("Updated question with ID {QuestionId}", question.Id);
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating question with ID {QuestionId}", question.Id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            await _container.DeleteItemAsync<Question>(id, new PartitionKey(id));
            _logger.LogInformation("Deleted question with ID {QuestionId}", id);
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Question with ID {QuestionId} not found for deletion", id);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting question with ID {QuestionId}", id);
            throw;
        }
    }
}
