using Asp.Versioning.Builder;
using IQChallenge.Api.Models;
using IQChallenge.Api.Repositories;
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

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
            .WithSummary("Upload questions via CSV file")
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<ApiResponse<object>>(201)
            .Produces(400)
            .Produces(500)
            .DisableAntiforgery();

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
                    "Content-Type must be multipart/form-data"));
            }

            var form = await context.Request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "CSV file is required"));
            }

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "File must be a CSV file"));
            }

            // Parse CSV file
            List<Question> questions;
            try
            {
                using var reader = new StreamReader(file.OpenReadStream());
                using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    TrimOptions = TrimOptions.Trim
                });

                var records = csv.GetRecords<QuestionCsvRecord>().ToList();
                questions = records.Select(r => new Question
                {
                    Category = r.Category,
                    QuestionText = r.Question,
                    Answers = new List<string> { r.Answer1, r.Answer2, r.Answer3, r.Answer4 },
                    CorrectAnswerKey = r.CorrectAnswerKey,
                    Metadata = string.IsNullOrWhiteSpace(r.Metadata) 
                        ? null 
                        : new Dictionary<string, string> { { "raw", r.Metadata } }
                }).ToList();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Invalid CSV format");
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    $"Invalid CSV format: {ex.Message}"));
            }

            if (!questions.Any())
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    "No valid questions found in the CSV file"));
            }

            // Validate questions
            var validationErrors = new List<string>();
            for (int i = 0; i < questions.Count; i++)
            {
                var q = questions[i];
                if (string.IsNullOrWhiteSpace(q.Category))
                    validationErrors.Add($"Row {i + 2}: Category is required");
                if (string.IsNullOrWhiteSpace(q.QuestionText))
                    validationErrors.Add($"Row {i + 2}: Question is required");
                if (q.Answers.Count != 4 || q.Answers.Any(string.IsNullOrWhiteSpace))
                    validationErrors.Add($"Row {i + 2}: All 4 answers are required");
                if (q.CorrectAnswerKey < 0 || q.CorrectAnswerKey > 3)
                    validationErrors.Add($"Row {i + 2}: CorrectAnswerKey must be between 0 and 3");
            }

            if (validationErrors.Any())
            {
                return Results.BadRequest(ApiResponse<object>.BadRequest(
                    $"Validation errors: {string.Join("; ", validationErrors)}"));
            }

            // Create questions in Cosmos DB
            var createdQuestions = await questionRepository.CreateManyAsync(questions);

            logger.LogInformation("Successfully uploaded {Count} questions from CSV", createdQuestions.Count);

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

    // CSV record mapping class
    private class QuestionCsvRecord
    {
        public string Category { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public string Answer1 { get; set; } = string.Empty;
        public string Answer2 { get; set; } = string.Empty;
        public string Answer3 { get; set; } = string.Empty;
        public string Answer4 { get; set; } = string.Empty;
        public int CorrectAnswerKey { get; set; }
        public string? Metadata { get; set; }
    }
}
