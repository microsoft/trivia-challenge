using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace IQChallenge.Api;

/// <summary>
/// Swagger operation filter to replace {version} placeholder with actual API version
/// </summary>
public class ApiVersionOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // The actual path substitution happens in the document filter
        // This filter can be used for operation-level modifications if needed
    }
}

/// <summary>
/// Swagger document filter to replace {version:apiVersion} with actual version in all paths
/// </summary>
public class ReplaceVersionWithExactValueInPathFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var paths = new OpenApiPaths();
        
        foreach (var path in swaggerDoc.Paths)
        {
            // Replace {version:apiVersion} or {version} with v1.0
            var newKey = path.Key
                .Replace("{version:apiVersion}", "1.0")
                .Replace("{version}", "1.0");
            
            paths.Add(newKey, path.Value);
        }
        
        swaggerDoc.Paths = paths;
    }
}

