using Microsoft.Azure.Cosmos;
using TriviaChallenge.Api.Models;
using TriviaChallenge.Api.Services;

namespace TriviaChallenge.Api.Repositories;

/// <summary>
/// Repository implementation for QuestionDraw operations
/// </summary>
public class QuestionDrawRepository : IQuestionDrawRepository
{
    private readonly Container _container;
    private readonly ILogger<QuestionDrawRepository> _logger;

    public QuestionDrawRepository(CosmosDbService cosmosDbService, ILogger<QuestionDrawRepository> logger)
    {
        _container = cosmosDbService.QuestionDrawsContainer;
        _logger = logger;
    }

    public async Task<QuestionDraw?> GetBySessionIdAsync(string sessionId)
    {
        try
        {
            var response = await _container.ReadItemAsync<QuestionDraw>(sessionId, new PartitionKey(sessionId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogInformation("Question draw with session ID {SessionId} not found", sessionId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question draw with session ID {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<QuestionDraw> CreateAsync(QuestionDraw draw)
    {
        try
        {
            draw.CreatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(draw, new PartitionKey(draw.Id));
            _logger.LogInformation("Created question draw with session ID {SessionId} and seed {Seed}", draw.Id, draw.Seed);
            
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question draw with session ID {SessionId}", draw.Id);
            throw;
        }
    }

    public async Task<QuestionDraw> CreateDrawFromQuestionsAsync(string sessionId, string userId, int seed, List<Question> questions)
    {
        try
        {
            var random = new Random(seed);
            
            // Shuffle questions
            var shuffledQuestions = questions.OrderBy(_ => random.Next()).ToList();
            
            var drawQuestions = new List<DrawQuestion>();
            
            foreach (var question in shuffledQuestions)
            {
                // Shuffle the answer choices
                var shuffledChoices = question.Answers.OrderBy(_ => random.Next()).ToList();
                
                // Find the new index of the correct answer after shuffling
                var correctAnswer = question.Answers[question.CorrectAnswerKey];
                var correctIndex = shuffledChoices.IndexOf(correctAnswer);
                
                drawQuestions.Add(new DrawQuestion
                {
                    QuestionId = question.Id,
                    QuestionText = question.QuestionText,
                    Choices = shuffledChoices,
                    CorrectAnswerIndex = correctIndex,
                    Category = question.Category ?? "General",
                    Metadata = question.Metadata
                });
            }
            
            var draw = new QuestionDraw
            {
                Id = sessionId,
                UserId = userId,
                Seed = seed,
                Questions = drawQuestions
            };
            
            return await CreateAsync(draw);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question draw from questions with session ID {SessionId} and seed {Seed}", sessionId, seed);
            throw;
        }
    }
}
