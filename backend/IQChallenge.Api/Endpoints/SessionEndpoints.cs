using Microsoft.AspNetCore.Mvc;
using Asp.Versioning.Builder;
using IQChallenge.Api.Models;
using IQChallenge.Api.Models.Dtos.Sessions;
using IQChallenge.Api.Repositories;

namespace IQChallenge.Api.Endpoints;

public static class SessionEndpoints
{
    public static IVersionedEndpointRouteBuilder MapSessionEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/sessions")
            .WithTags("Sessions")
            .WithOpenApi();

        group.MapPost("/start", StartSession)
            .WithName("StartSession")
            .WithSummary("Start a new game session")
            .Produces<ApiResponse<StartSessionResponse>>(201)
            .Produces(400)
            .Produces(500);

        group.MapGet("/{sessionId}/questions", GetSessionQuestions)
            .WithName("GetSessionQuestions")
            .WithSummary("Get all questions for a session")
            .Produces<ApiResponse<SessionQuestionsResponse>>(200)
            .Produces(404)
            .Produces(500);

        group.MapPost("/{sessionId}/answers", SubmitAnswer)
            .WithName("SubmitAnswer")
            .WithSummary("Submit an answer and get points")
            .Produces<ApiResponse<SubmitAnswerResponse>>(200)
            .Produces(400)
            .Produces(404)
            .Produces(500);

        group.MapPost("/{sessionId}/end", EndSession)
            .WithName("EndSession")
            .WithSummary("End a session and get final results")
            .Produces<ApiResponse<EndSessionResponse>>(200)
            .Produces(400)
            .Produces(404)
            .Produces(500);

        return builder;
    }

    private static async Task<IResult> StartSession(
        [FromBody] StartSessionRequest request,
        IGameSessionRepository sessionRepository,
        IQuestionDrawRepository drawRepository,
        IQuestionRepository questionRepository,
        ILogger<Program> logger)
    {
        try
        {
            var seed = Random.Shared.Next();
            var allQuestions = await questionRepository.GetAllAsync();
            
            if (allQuestions == null || allQuestions.Count == 0)
            {
                return Results.BadRequest(ApiResponse<StartSessionResponse>.BadRequest("No questions available"));
            }

            var sessionId = Guid.NewGuid().ToString();
            var draw = await drawRepository.CreateDrawFromQuestionsAsync(sessionId, request.UserId, seed, allQuestions);

            var session = new GameSession
            {
                Id = sessionId,
                UserId = request.UserId,
                Seed = seed,
                Status = "active",
                StartTime = DateTime.UtcNow,
                TotalScore = 0,
                QuestionsAnswered = 0,
                CorrectAnswers = 0,
                StreaksCompleted = 0
            };

            var createdSession = await sessionRepository.CreateAsync(session);

            var response = new StartSessionResponse
            {
                SessionId = createdSession.Id,
                UserId = createdSession.UserId,
                Seed = createdSession.Seed,
                QuestionsUrl = $"/api/v1.0/sessions/{createdSession.Id}/questions",
                StartTime = createdSession.StartTime,
                Status = createdSession.Status
            };

            logger.LogInformation("Created session {SessionId} for user {UserId} with seed {Seed}", 
                createdSession.Id, createdSession.UserId, createdSession.Seed);

            return Results.Created($"/api/v1.0/sessions/{createdSession.Id}", ApiResponse<StartSessionResponse>.Created(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error starting session for user {UserId}", request.UserId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetSessionQuestions(
        string sessionId,
        IGameSessionRepository sessionRepository,
        IQuestionDrawRepository drawRepository,
        ILogger<Program> logger)
    {
        try
        {
            var draw = await drawRepository.GetBySessionIdAsync(sessionId);
            if (draw == null || draw.Questions == null)
            {
                return Results.NotFound(ApiResponse<SessionQuestionsResponse>.NotFound("Questions not found for session"));
            }

            var questionDtos = draw.Questions.Select(q => new SessionQuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                Category = q.Category ?? string.Empty,
                Choices = q.Choices,
                CorrectAnswerIndex = q.CorrectAnswerIndex,
                Metadata = q.Metadata
            }).ToList();

            var response = new SessionQuestionsResponse
            {
                Questions = questionDtos
            };

            logger.LogInformation("Retrieved {QuestionCount} questions for session {SessionId}", 
                questionDtos.Count, sessionId);

            return Results.Ok(ApiResponse<SessionQuestionsResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting questions for session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> SubmitAnswer(
        string sessionId,
        [FromBody] SubmitAnswerRequest request,
        IGameSessionRepository sessionRepository,
        IQuestionDrawRepository drawRepository,
        IGameSessionAnswerRepository answerRepository,
        ILogger<Program> logger)
    {
        try
        {
            // Get the question draw first to retrieve userId for partition key
            var draw = await drawRepository.GetBySessionIdAsync(sessionId);
            if (draw == null || draw.Questions == null)
            {
                return Results.NotFound(ApiResponse<SubmitAnswerResponse>.NotFound("Questions not found for session"));
            }

            var session = await sessionRepository.GetByIdAsync(sessionId, draw.UserId);
            if (session == null)
            {
                return Results.NotFound(ApiResponse<SubmitAnswerResponse>.NotFound("Session not found"));
            }

            if (session.Status != "active")
            {
                return Results.BadRequest(ApiResponse<SubmitAnswerResponse>.BadRequest("Session is not active"));
            }

            var question = draw.Questions.FirstOrDefault(q => q.QuestionId == request.QuestionId);
            if (question == null)
            {
                return Results.BadRequest(ApiResponse<SubmitAnswerResponse>.BadRequest("Question not found in session"));
            }

            var isCorrect = request.AnswerIndex == question.CorrectAnswerIndex;
            int pointsEarned = 0;
            
            if (isCorrect)
            {
                // Simplified scoring: 10 points per correct answer
                pointsEarned = 10;
            }

            var answerRecord = new GameSessionAnswer
            {
                Id = Guid.NewGuid().ToString(),
                UserId = session.UserId,
                SessionId = sessionId,
                QuestionId = request.QuestionId,
                AnswerIndex = request.AnswerIndex,
                IsCorrect = isCorrect,
                PointsEarned = pointsEarned,
                TimeElapsed = request.TimeElapsed,
                Timestamp = DateTime.UtcNow
            };

            await answerRepository.CreateAsync(answerRecord);

            session.TotalScore += pointsEarned;
            session.QuestionsAnswered++;
            if (isCorrect)
            {
                session.CorrectAnswers++;
            }

            await sessionRepository.UpdateAsync(session);

            var response = new SubmitAnswerResponse
            {
                PointsEarned = pointsEarned,
                TotalScore = session.TotalScore
            };

            logger.LogInformation("Answer submitted for session {SessionId}, question {QuestionId}: {IsCorrect}, points: {Points}", 
                sessionId, request.QuestionId, isCorrect, pointsEarned);

            return Results.Ok(ApiResponse<SubmitAnswerResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error submitting answer for session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> EndSession(
        string sessionId,
        [FromBody] EndSessionRequest request,
        IGameSessionRepository sessionRepository,
        IQuestionDrawRepository drawRepository,
        ILogger<Program> logger)
    {
        try
        {
            // Get the question draw first to retrieve userId for partition key
            var draw = await drawRepository.GetBySessionIdAsync(sessionId);
            if (draw == null)
            {
                return Results.NotFound(ApiResponse<EndSessionResponse>.NotFound("Session not found"));
            }

            var session = await sessionRepository.GetByIdAsync(sessionId, draw.UserId);
            if (session == null)
            {
                return Results.NotFound(ApiResponse<EndSessionResponse>.NotFound("Session not found"));
            }

            if (session.Status != "active")
            {
                return Results.BadRequest(ApiResponse<EndSessionResponse>.BadRequest("Session is not active"));
            }

            session.Status = "completed";
            session.EndTime = DateTime.UtcNow;
            session.QuestionsAnswered = request.QuestionsAnswered;
            session.CorrectAnswers = request.CorrectAnswers;
            session.StreaksCompleted = request.StreaksCompleted;

            await sessionRepository.UpdateAsync(session);

            var accuracy = session.QuestionsAnswered > 0 
                ? (double)session.CorrectAnswers / session.QuestionsAnswered * 100 
                : 0.0;

            var response = new EndSessionResponse
            {
                SessionId = session.Id,
                FinalScore = session.TotalScore,
                QuestionsAnswered = session.QuestionsAnswered,
                CorrectAnswers = session.CorrectAnswers,
                Accuracy = accuracy,
                StreaksCompleted = session.StreaksCompleted
            };

            logger.LogInformation("Session {SessionId} ended with score {Score}, {Correct}/{Total} correct", 
                sessionId, session.TotalScore, session.CorrectAnswers, session.QuestionsAnswered);

            return Results.Ok(ApiResponse<EndSessionResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error ending session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }
}
