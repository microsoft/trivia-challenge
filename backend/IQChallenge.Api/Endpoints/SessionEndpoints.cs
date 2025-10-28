using Asp.Versioning.Builder;
using IQChallenge.Api.Models;
using IQChallenge.Api.Models.Dtos.Sessions;
using IQChallenge.Api.Repositories;

namespace IQChallenge.Api.Endpoints;

/// <summary>
/// Game session-related endpoints
/// </summary>
public static class SessionEndpoints
{
    public static IVersionedEndpointRouteBuilder MapSessionEndpoints(this IVersionedEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("/api/v{version:apiVersion}/sessions")
            .WithTags("Sessions")
            .WithOpenApi();

        group.MapPost("/", CreateSession)
            .WithName("CreateSession")
            .WithSummary("Create a new game session")
            .Produces<ApiResponse<SessionResponse>>(201)
            .Produces(400)
            .Produces(500);

        group.MapGet("/{sessionId}", GetSession)
            .WithName("GetSession")
            .WithSummary("Get session by ID")
            .Produces<ApiResponse<SessionResponse>>(200)
            .Produces(404)
            .Produces(500);

        group.MapPost("/{sessionId}/start", StartSession)
            .WithName("StartSession")
            .WithSummary("Start a game session")
            .Produces<ApiResponse<SessionResponse>>(200)
            .Produces(404)
            .Produces(400)
            .Produces(500);

        group.MapPost("/{sessionId}/complete", CompleteSession)
            .WithName("CompleteSession")
            .WithSummary("Complete a game session with results")
            .Produces<ApiResponse<SessionResponse>>(200)
            .Produces(404)
            .Produces(400)
            .Produces(500);

        group.MapGet("/leaderboard/top", GetTopScores)
            .WithName("GetTopScores")
            .WithSummary("Get leaderboard top scores")
            .Produces<ApiResponse<List<SessionResponse>>>(200)
            .Produces(500);

        return builder;
    }

    private static async Task<IResult> CreateSession(
        Models.Dtos.Sessions.CreateSessionRequest request,
        IGameSessionRepository sessionRepository,
        IQuestionDrawRepository drawRepository,
        IQuestionRepository questionRepository,
        ILogger<Program> logger)
    {
        try
        {
            int drawSeed;
            QuestionDraw? draw;

            if (request.DrawSeed.HasValue)
            {
                // Use specified draw seed
                drawSeed = request.DrawSeed.Value;
                draw = await drawRepository.GetBySeedAsync(drawSeed);

                if (draw == null)
                {
                    return Results.BadRequest(ApiResponse<SessionResponse>.BadRequest($"Draw with seed {drawSeed} not found"));
                }
            }
            else
            {
                // Generate new random draw
                drawSeed = new Random().Next();
                
                // Get all questions
                var allQuestions = await questionRepository.GetAllAsync();
                
                if (allQuestions.Count == 0)
                {
                    return Results.BadRequest(ApiResponse<SessionResponse>.BadRequest("No questions available"));
                }
                
                // Create new draw
                draw = await drawRepository.CreateDrawFromQuestionsAsync(drawSeed, allQuestions);
            }

            var session = new GameSession
            {
                UserEmail = request.UserEmail.ToLowerInvariant(),
                DrawSeed = drawSeed,
                Status = "created"
            };

            var createdSession = await sessionRepository.CreateAsync(session);

            var response = new SessionResponse
            {
                SessionId = createdSession.Id,
                UserEmail = createdSession.UserEmail,
                DrawSeed = createdSession.DrawSeed,
                Status = createdSession.Status,
                TotalScore = createdSession.TotalScore,
                MaxStreak = createdSession.MaxStreak,
                CorrectAnswers = createdSession.CorrectAnswers,
                IncorrectAnswers = createdSession.IncorrectAnswers,
                CreatedAt = createdSession.CreatedAt,
                StartedAt = createdSession.StartedAt,
                CompletedAt = createdSession.CompletedAt
            };

            return Results.Created($"/api/v1.0/sessions/{createdSession.Id}", ApiResponse<SessionResponse>.Created(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating session");
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetSession(
        string sessionId,
        IGameSessionRepository sessionRepository,
        ILogger<Program> logger)
    {
        try
        {
            var session = await sessionRepository.GetByIdAsync(sessionId);

            if (session == null)
            {
                return Results.NotFound(ApiResponse<SessionResponse>.NotFound("Session not found"));
            }

            var response = new SessionResponse
            {
                SessionId = session.Id,
                UserEmail = session.UserEmail,
                DrawSeed = session.DrawSeed,
                Status = session.Status,
                TotalScore = session.TotalScore,
                MaxStreak = session.MaxStreak,
                CorrectAnswers = session.CorrectAnswers,
                IncorrectAnswers = session.IncorrectAnswers,
                CreatedAt = session.CreatedAt,
                StartedAt = session.StartedAt,
                CompletedAt = session.CompletedAt
            };

            return Results.Ok(ApiResponse<SessionResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> StartSession(
        string sessionId,
        IGameSessionRepository sessionRepository,
        ILogger<Program> logger)
    {
        try
        {
            var session = await sessionRepository.GetByIdAsync(sessionId);

            if (session == null)
            {
                return Results.NotFound(ApiResponse<SessionResponse>.NotFound("Session not found"));
            }

            if (session.Status != "created")
            {
                return Results.BadRequest(ApiResponse<SessionResponse>.BadRequest("Session already started"));
            }

            session.Status = "active";
            session.StartedAt = DateTime.UtcNow;

            var updatedSession = await sessionRepository.UpdateAsync(session);

            var response = new SessionResponse
            {
                SessionId = updatedSession.Id,
                UserEmail = updatedSession.UserEmail,
                DrawSeed = updatedSession.DrawSeed,
                Status = updatedSession.Status,
                TotalScore = updatedSession.TotalScore,
                MaxStreak = updatedSession.MaxStreak,
                CorrectAnswers = updatedSession.CorrectAnswers,
                IncorrectAnswers = updatedSession.IncorrectAnswers,
                CreatedAt = updatedSession.CreatedAt,
                StartedAt = updatedSession.StartedAt,
                CompletedAt = updatedSession.CompletedAt
            };

            return Results.Ok(ApiResponse<SessionResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error starting session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> CompleteSession(
        string sessionId,
        CompleteSessionRequest request,
        IGameSessionRepository sessionRepository,
        ILogger<Program> logger)
    {
        try
        {
            var session = await sessionRepository.GetByIdAsync(sessionId);

            if (session == null)
            {
                return Results.NotFound(ApiResponse<SessionResponse>.NotFound("Session not found"));
            }

            if (session.Status == "completed")
            {
                return Results.BadRequest(ApiResponse<SessionResponse>.BadRequest("Session already completed"));
            }

            session.Status = "completed";
            session.CompletedAt = DateTime.UtcNow;
            session.TotalScore = request.TotalScore;
            session.MaxStreak = request.MaxStreak;
            session.CorrectAnswers = request.CorrectAnswers;
            session.IncorrectAnswers = request.IncorrectAnswers;

            var updatedSession = await sessionRepository.UpdateAsync(session);

            var response = new SessionResponse
            {
                SessionId = updatedSession.Id,
                UserEmail = updatedSession.UserEmail,
                DrawSeed = updatedSession.DrawSeed,
                Status = updatedSession.Status,
                TotalScore = updatedSession.TotalScore,
                MaxStreak = updatedSession.MaxStreak,
                CorrectAnswers = updatedSession.CorrectAnswers,
                IncorrectAnswers = updatedSession.IncorrectAnswers,
                CreatedAt = updatedSession.CreatedAt,
                StartedAt = updatedSession.StartedAt,
                CompletedAt = updatedSession.CompletedAt
            };

            return Results.Ok(ApiResponse<SessionResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error completing session {SessionId}", sessionId);
            return Results.StatusCode(500);
        }
    }

    private static async Task<IResult> GetTopScores(
        int count,
        bool daily,
        IGameSessionRepository sessionRepository,
        ILogger<Program> logger)
    {
        try
        {
            DateTime? since = daily ? DateTime.UtcNow.Date : null;
            var sessions = await sessionRepository.GetTopScoresAsync(count, since);

            var response = sessions.Select(s => new SessionResponse
            {
                SessionId = s.Id,
                UserEmail = s.UserEmail,
                DrawSeed = s.DrawSeed,
                Status = s.Status,
                TotalScore = s.TotalScore,
                MaxStreak = s.MaxStreak,
                CorrectAnswers = s.CorrectAnswers,
                IncorrectAnswers = s.IncorrectAnswers,
                CreatedAt = s.CreatedAt,
                StartedAt = s.StartedAt,
                CompletedAt = s.CompletedAt
            }).ToList();

            return Results.Ok(ApiResponse<List<SessionResponse>>.Ok(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error retrieving top scores");
            return Results.StatusCode(500);
        }
    }
}
