using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace IQChallenge.Api.Endpoints;

public static class DebugEndpoints
{
    private const string AccessKey = "9f6c5a38b7e54d3aa2e1c6f4d0b8e7c1f3a9d5b2c4e6f8a1b3c5d7e9f1a3b5c7";

    private static readonly string[] SensitiveKeyFragments =
    {
        "key",
        "secret",
        "token",
        "password",
        "connectionstring",
        "credential"
    };

    public static void MapDebugEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/_debug/config", GetConfiguration)
            .WithName("GetDebugConfiguration")
            .WithSummary("Returns the current application configuration with sensitive values masked")
            .ExcludeFromDescription();
    }

    private static IResult GetConfiguration(HttpContext context, IConfiguration configuration)
    {
        var providedKey = context.Request.Query["key"].ToString();

        if (!string.Equals(providedKey, AccessKey, StringComparison.Ordinal))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var payload = BuildConfigurationObject(configuration);
        return Results.Ok(payload);
    }

    private static object BuildConfigurationObject(IConfiguration configuration)
    {
        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var section in configuration.GetChildren())
        {
            dict[section.Key] = BuildSection(section);
        }

        return dict;
    }

    private static object? BuildSection(IConfigurationSection section)
    {
        var children = section.GetChildren().ToList();

        if (children.Count == 0)
        {
            return MaskIfSensitive(section.Key, section.Value);
        }

        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var child in children)
        {
            dict[child.Key] = BuildSection(child);
        }

        return dict;
    }

    private static string? MaskIfSensitive(string key, string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return IsSensitiveKey(key)
            ? MaskValue(value)
            : value;
    }

    private static bool IsSensitiveKey(string key)
    {
        var lower = key.ToLowerInvariant();
        return SensitiveKeyFragments.Any(fragment => lower.Contains(fragment, StringComparison.OrdinalIgnoreCase));
    }

    private static string MaskValue(string value)
    {
        var visible = value.Length <= 3 ? value : value.Substring(0, 3);
        return visible + new string('*', 15);
    }
}