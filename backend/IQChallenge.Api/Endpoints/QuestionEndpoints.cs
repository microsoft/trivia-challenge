using Asp.Versioning.Builder;
using IQChallenge.Api.Models;
using IQChallenge.Api.Models.Dtos.Questions;
using IQChallenge.Api.Repositories;
using System.Text.Json;

namespace IQChallenge.Api.Endpoints;

/// <summary>
/// Question-related endpoints
/// </summary>
public static class QuestionEndpoints
{
    public static IVersionedEndpointRouteBuilder MapQuestionEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/questions")
            .WithTags("Questions")
            .WithOpenApi();

        group.MapPost("/upload", UploadQuestions)
            .WithName("UploadQuestions")
            .WithSummary("Upload questions via form data")
            .Accepts<IFormCollection>("application/x-www-form-urlencoded")
            .Produces<ApiResponse<object>>(201)
            .Produces(400)
            .Produces(500)
            .DisableAntiforgery();

        group.MapGet("/draws/{seed}", GetQuestionDraw)
            .WithName("GetQuestionDraw")
            .WithSummary("Get question draw by seed")
            .Produces<ApiResponse<QuestionDrawResponse>>(200)
            .Produces(404)
            .Produces(500);

        return builder;
    }

    private static async Task<IResult> UploadQuestions(
        HttpContext context,
        IQuestionRepository questionRepository,
        ILogger<Program> logger)
    {
        try
        {
            if (!context.Request.HasFormContentType)
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "Content-Type must be application/x-www-form-urlencoded or multipart/form-data"));
            }

            var form = await context.Request.ReadFormAsync();
            var questionsJson = form["questionsJson"].ToString();

            if (string.IsNullOrWhiteSpace(questionsJson))
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "questionsJson field is required"));
            }

            // Parse JSON array of questions
            List<Question>? questions;
            try
            {
                questions = JsonSerializer.Deserialize<List<Question>>(questionsJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Invalid JSON format for questions");
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "Invalid JSON format. Please provide a valid JSON array of questions."));
            }

            if (questions == null || !questions.Any())
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "No valid questions found in the provided JSON"));
            }

            // Validate questions
            var validationErrors = new List<string>();
            for (int i = 0; i < questions.Count; i++)
            {
                var q = questions[i];
                if (string.IsNullOrWhiteSpace(q.QuestionText))
                    validationErrors.Add($"Question {i + 1}: QuestionText is required");
                if (string.IsNullOrWhiteSpace(q.Answer))
                    validationErrors.Add($"Question {i + 1}: Answer is required");
            }

            if (validationErrors.Any())
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    $"Validation errors: {string.Join("; ", validationErrors)}"));
            }

            // Create questions in Cosmos DB
            var createdQuestions = await questionRepository.CreateManyAsync(questions);

            logger.LogInformation("Successfully uploaded {Count} questions", createdQuestions.Count);

            return Results.Created("/api/v1.0/questions/upload", ApiResponse<object>.Created(new
            {
                Message = $"Successfully uploaded {createdQuestions.Count} questions",
                Count = createdQuestions.Count,
                QuestionIds = createdQuestions.Select(q => q.Id).ToList()
            }));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error uploading questions");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetQuestionDraw(
        int seed,
        IQuestionDrawRepository drawRepository,
        ILogger<Program> logger)
    {
        try
        {
            var draw = await drawRepository.GetBySeedAsync(seed);

            if (draw == null)
            {
                return Results.NotFound(ApiResponse<QuestionDrawResponse>.NotFound("Question draw not found"));
            }

            var response = new QuestionDrawResponse
            {
                Seed = draw.Seed,
                Questions = draw.Questions.Select(q => new DrawQuestionResponse
                {
                    QuestionId = q.QuestionId,
                    QuestionText = q.QuestionText,
                    Choices = q.Choices,
                    CorrectAnswerIndex = q.CorrectAnswerIndex,
                    Category = q.Category
                }).ToList(),
                CreatedAt = draw.CreatedAt
            };

            return Results.Ok(ApiResponse<QuestionDrawResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving question draw with seed {Seed}", seed);
            return Results.StatusCode(500);
        }
    }
}
