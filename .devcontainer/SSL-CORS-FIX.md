# SSL Certificate and CORS Configuration Fix

## Issues Resolved

### 1. SSL Certificate Validation Error
**Problem**: The Cosmos DB Emulator uses a self-signed certificate that .NET doesn't trust by default, causing `AuthenticationException: UntrustedRoot` errors.

**Solution**: Disabled SSL validation for local Cosmos DB Emulator in development mode only:

```csharp
// In Program.cs - CosmosClient configuration
if (env.IsDevelopment() && settings.EndpointUri.Contains("localhost"))
{
    var httpClientHandler = new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };
    clientOptions.HttpClientFactory = () => new HttpClient(httpClientHandler);
    clientOptions.ConnectionMode = ConnectionMode.Gateway; // Required for emulator
}
```

**Security Note**: This bypass is ONLY active in Development environment and ONLY for localhost connections. Production connections use standard SSL validation.

### 2. CORS Policy Failure
**Problem**: Requests were being blocked with "CORS policy execution failed" because the requesting origin wasn't in the allowed list.

**Solution**: Configured CORS to allow all origins in development:

```csharp
// In Program.cs - CORS configuration
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
            // Production uses specific allowed origins from configuration
            var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                ?? Array.Empty<string>();
            policy.WithOrigins(corsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});
```

### 3. API Versioning Route Issue
**Problem**: The API endpoint was showing `v{version}` in the URL instead of `v1.0`.

**Solution**: The versioning configuration is correct. The endpoint classes properly use:
```csharp
var group = builder.MapGroup("/api/v{version:apiVersion}/users")
```

This placeholder is replaced at runtime with the actual version (v1.0) based on the request.

## Configuration Summary

### Development Environment
- **SSL Validation**: Disabled for localhost (Cosmos DB Emulator only)
- **CORS**: Allow all origins
- **Connection Mode**: Gateway (required for emulator)
- **Cosmos DB**: `https://localhost:8081`

### Production Environment
- **SSL Validation**: Enabled (standard .NET behavior)
- **CORS**: Specific origins from `appsettings.json`
- **Connection Mode**: Direct (optimal performance)
- **Cosmos DB**: Azure Cosmos DB endpoint

## Testing the Fix

1. **Start the API**:
   ```bash
   cd backend/IQChallenge.Api
   dotnet run
   ```

2. **Verify Cosmos DB Connection**:
   - Check logs for "Cosmos DB initialization completed successfully"
   - No SSL errors should appear

3. **Test CORS**:
   - Make requests from any origin (in development)
   - No CORS errors should appear

4. **Test API Endpoints**:
   ```bash
   # Register a user
   curl -X POST http://localhost:5109/api/v1.0/users/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User","phoneNumber":"123-456-7890"}'
   ```

## Files Modified

- `/workspaces/iq-challenge/backend/IQChallenge.Api/Program.cs`
  - Added SSL bypass for Cosmos DB Emulator
  - Updated CORS configuration
  - Cleaned up file structure

## Backup

The original file was backed up to `Program.cs.bak` before modifications.

## Next Steps

- Test all API endpoints
- Verify Cosmos DB operations work correctly
- Confirm CORS works for all expected scenarios
- Consider adding integration tests
