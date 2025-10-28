using Microsoft.Azure.Cosmos;
using Asp.Versioning;
using IQChallenge.Api;
using IQChallenge.Api.Models;
using IQChallenge.Api.Services;
using IQChallenge.Api.Repositories;
using IQChallenge.Api.Middleware;
using IQChallenge.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

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
    options.SwaggerDoc("v1.0", new()
    {
        Title = "IQ Challenge API",
        Version = "v1.0",
        Description = "API for Microsoft Fabric IQ Challenge quiz game",
        Contact = new()
        {
            Name = "Microsoft Fabric IQ Challenge",
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

// Configure Cosmos DB
var cosmosDbSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()
    ?? throw new InvalidOperationException("CosmosDb configuration is missing");

builder.Services.AddSingleton(cosmosDbSettings);

// Register Cosmos DB Client as singleton
builder.Services.AddSingleton<CosmosClient>(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<CosmosDbSettings>();
    var env = serviceProvider.GetRequiredService<IWebHostEnvironment>();
    
    var clientOptions = new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        },
        MaxRetryAttemptsOnRateLimitedRequests = 3,
        MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(10)
    };

    // Disable SSL validation for local Cosmos DB Emulator in development
    if (env.IsDevelopment() && settings.EndpointUri.Contains("localhost"))
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

    return new CosmosClient(settings.EndpointUri, settings.PrimaryKey, clientOptions);
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
        logger);
});

// Register repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<IQuestionDrawRepository, QuestionDrawRepository>();
builder.Services.AddScoped<IGameSessionRepository, GameSessionRepository>();

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
        options.SwaggerEndpoint("/swagger/v1.0/swagger.json", "IQ Challenge API v1.0");
    });
}

app.UseRequestLogging();
app.UseCors();

// Initialize Cosmos DB
var cosmosDbService = app.Services.GetRequiredService<CosmosDbService>();
await cosmosDbService.InitializeDatabaseAsync();

// Map API endpoints with versioning
var versionedApi = app.NewVersionedApi();
versionedApi.MapUserEndpoints();
versionedApi.MapSessionEndpoints();
versionedApi.MapQuestionEndpoints();

app.MapGet("/", () => "IQ Challenge API is running. Visit /swagger for API documentation.")
    .ExcludeFromDescription();

app.Run();
