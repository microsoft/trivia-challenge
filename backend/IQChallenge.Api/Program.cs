using Microsoft.Azure.Cosmos;
using Azure.Identity;
using Azure.Messaging.EventHubs.Producer;
using Asp.Versioning;
using IQChallenge.Api;
using IQChallenge.Api.Models;
using IQChallenge.Api.Services;
using IQChallenge.Api.Repositories;
using IQChallenge.Api.Middleware;
using IQChallenge.Api.Endpoints;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel limits
builder.WebHost.ConfigureKestrel(options =>
{
    var maxRequestBodySize = builder.Configuration.GetValue<long?>("Kestrel:Limits:MaxRequestBodySize") ?? 10485760; // 10MB default
    options.Limits.MaxRequestBodySize = maxRequestBodySize;
});

// Add API versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader()
    );
});

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Trivia Challenge API",
        Version = "v1.0",
        Description = "API for Microsoft Fabric Trivia Challenge quiz game",
        Contact = new()
        {
            Name = "Microsoft Fabric Trivia Challenge",
            Url = new Uri("https://github.com/microsoft/iq-challenge")
        },
        License = new()
        {
            Name = "MIT License",
            Url = new Uri("https://github.com/microsoft/iq-challenge/blob/main/LICENSE")
        }
    });
    
    options.TagActionsBy(api => new[] { api.GroupName ?? "API" });
    options.DocInclusionPredicate((name, api) => true);
    
    // Replace {version} placeholder with actual version in Swagger
    options.DocumentFilter<ReplaceVersionWithExactValueInPathFilter>();
});

// Add response compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = new[]
    {
        "application/json",
        "application/xml",
        "text/plain",
        "text/json",
        "text/xml"
    };
});

// Configure Cosmos DB with validation
var cosmosDbSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()
    ?? throw new InvalidOperationException("CosmosDb configuration is missing");

// Validate configuration
try
{
    cosmosDbSettings.Validate();
}
catch (ValidationException ex)
{
    throw new InvalidOperationException($"Invalid CosmosDb configuration: {ex.Message}", ex);
}

builder.Services.AddSingleton(cosmosDbSettings);

// Configure telemetry / Event Hub integration
var telemetrySettings = builder.Configuration.GetSection("Telemetry").Get<TelemetrySettings>() ?? new TelemetrySettings();

try
{
    telemetrySettings.Validate();
}
catch (ValidationException ex)
{
    throw new InvalidOperationException($"Invalid Telemetry configuration: {ex.Message}", ex);
}

builder.Services.AddSingleton(telemetrySettings);

if (telemetrySettings.Enabled)
{
    builder.Services.AddSingleton<EventHubProducerClient>(serviceProvider =>
    {
        var logger = serviceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Telemetry forwarding enabled - initializing Event Hub producer client.");

        return new EventHubProducerClient(
            telemetrySettings.ConnectionString!,
            telemetrySettings.EventHubName!);
    });

    builder.Services.AddSingleton<ITelemetryService, EventHubTelemetryService>();
}
else
{
    builder.Services.AddSingleton<ITelemetryService, NoOpTelemetryService>();
}

// Register Cosmos DB Client as singleton
builder.Services.AddSingleton<CosmosClient>(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<CosmosDbSettings>();
    var env = serviceProvider.GetRequiredService<IWebHostEnvironment>();
    var logger = serviceProvider.GetRequiredService<ILogger<Program>>();
    
    var clientOptions = new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        },
        MaxRetryAttemptsOnRateLimitedRequests = settings.MaxRetryAttempts,
        MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(settings.MaxRetryWaitTimeSeconds)
    };

    // Disable SSL validation for local Cosmos DB Emulator in development
    var uri = new Uri(settings.EndpointUri);
    if (env.IsDevelopment() && (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)))
    {
        var httpClientHandler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        };
        clientOptions.HttpClientFactory = () => new HttpClient(httpClientHandler);
        clientOptions.ConnectionMode = ConnectionMode.Gateway;
    }
    else
    {
        clientOptions.ConnectionMode = ConnectionMode.Direct;
    }

    // Use PrimaryKey if provided, otherwise use Managed Identity
    if (!string.IsNullOrWhiteSpace(settings.PrimaryKey))
    {
        logger.LogInformation("Initializing Cosmos DB client with PrimaryKey authentication");
        return new CosmosClient(settings.EndpointUri, settings.PrimaryKey, clientOptions);
    }
    else
    {
        logger.LogInformation("Initializing Cosmos DB client with Managed Identity authentication");
        var credential = new DefaultAzureCredential();
        return new CosmosClient(settings.EndpointUri, credential, clientOptions);
    }
});

// Register CosmosDbService
builder.Services.AddSingleton<CosmosDbService>(serviceProvider =>
{
    var cosmosClient = serviceProvider.GetRequiredService<CosmosClient>();
    var settings = serviceProvider.GetRequiredService<CosmosDbSettings>();
    var logger = serviceProvider.GetRequiredService<ILogger<CosmosDbService>>();

    return new CosmosDbService(
        cosmosClient,
        settings.DatabaseName,
        settings.UsersContainerName,
        settings.QuestionsContainerName,
        settings.QuestionDrawsContainerName,
        settings.GameSessionsContainerName,
        settings.GameSessionAnswersContainerName,
        logger);
});

// Register repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<IQuestionDrawRepository, QuestionDrawRepository>();
builder.Services.AddScoped<IGameSessionRepository, GameSessionRepository>();
builder.Services.AddScoped<IGameSessionAnswerRepository, GameSessionAnswerRepository>();

// Add background service for database initialization
builder.Services.AddHostedService<DatabaseInitializationService>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck<CosmosDbHealthCheck>("cosmosdb", tags: new[] { "ready", "db" });

// Configure rate limiting
var rateLimitConfig = builder.Configuration.GetSection("RateLimit");
var permitLimit = rateLimitConfig.GetValue<int>("PermitLimit", 100);
var windowSeconds = rateLimitConfig.GetValue<int>("WindowSeconds", 60);
var queueLimit = rateLimitConfig.GetValue<int>("QueueLimit", 10);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    options.AddFixedWindowLimiter("fixed", limiterOptions =>
    {
        limiterOptions.PermitLimit = permitLimit;
        limiterOptions.Window = TimeSpan.FromSeconds(windowSeconds);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = queueLimit;
    });

    // Global rate limiter
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        // Rate limit by IP address
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = TimeSpan.FromSeconds(windowSeconds),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = queueLimit
        });
    });
});

// Configure CORS - Allow all origins in development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
        else
        {
            var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                ?? Array.Empty<string>();
            policy.WithOrigins(corsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Fabric Trivia Challenge API v1.0");
    });
}
else
{
    // In production, serve static files from wwwroot
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseRequestLogging();
app.UseResponseCompression();
app.UseCors();
app.UseRateLimiter();

app.MapDebugEndpoints();

// Health check endpoints
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => true,
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            }),
            totalDuration = report.TotalDuration.TotalMilliseconds
        };
        await context.Response.WriteAsJsonAsync(response);
    }
}).RequireRateLimiting("fixed");

app.MapHealthChecks("/healthz", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).RequireRateLimiting("fixed");

// Map API endpoints with versioning
var versionedApi = app.NewVersionedApi();
versionedApi.MapUserEndpoints();
versionedApi.MapSessionEndpoints();
versionedApi.MapQuestionEndpoints();
versionedApi.MapTelemetryEndpoints();

// Root endpoint - API info in development, SPA fallback in production
if (app.Environment.IsDevelopment())
{
    app.MapGet("/", () => "Fabric Trivia Challenge API is running. Visit /swagger for API documentation.")
        .ExcludeFromDescription();
}
else
{
    // SPA fallback - serve index.html for all non-API routes
    app.MapFallbackToFile("index.html");
}

app.Run();
