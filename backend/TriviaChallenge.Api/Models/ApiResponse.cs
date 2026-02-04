namespace TriviaChallenge.Api.Models;

/// <summary>
/// Standard API response wrapper
/// </summary>
/// <typeparam name="T">Type of data being returned</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Indicates if the request was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The response data
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Error message if the request failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// HTTP status code
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// Creates a successful response
    /// </summary>
    public static ApiResponse<T> Ok(T data)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            StatusCode = 200
        };
    }

    /// <summary>
    /// Creates a created response (201)
    /// </summary>
    public static ApiResponse<T> Created(T data)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            StatusCode = 201
        };
    }

    /// <summary>
    /// Creates an error response
    /// </summary>
    public static ApiResponse<T> Error(string errorMessage, int statusCode = 500)
    {
        return new ApiResponse<T>
        {
            Success = false,
            ErrorMessage = errorMessage,
            StatusCode = statusCode
        };
    }

    /// <summary>
    /// Creates a not found response (404)
    /// </summary>
    public static ApiResponse<T> NotFound(string errorMessage = "Resource not found")
    {
        return new ApiResponse<T>
        {
            Success = false,
            ErrorMessage = errorMessage,
            StatusCode = 404
        };
    }

    /// <summary>
    /// Creates a bad request response (400)
    /// </summary>
    public static ApiResponse<T> BadRequest(string errorMessage)
    {
        return new ApiResponse<T>
        {
            Success = false,
            ErrorMessage = errorMessage,
            StatusCode = 400
        };
    }
}
