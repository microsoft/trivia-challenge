using Xunit;
using IQChallenge.Api.Models;

namespace IQChallenge.Api.Tests.Models;

public class ApiResponseTests
{
    [Fact]
    public void ApiResponse_Ok_ShouldCreateSuccessResponse()
    {
        // Arrange
        var data = "Test data";

        // Act
        var response = ApiResponse<string>.Ok(data);

        // Assert
        Assert.True(response.Success);
        Assert.Equal(data, response.Data);
        Assert.Equal(200, response.StatusCode);
        Assert.Null(response.ErrorMessage);
    }

    [Fact]
    public void ApiResponse_Created_ShouldCreateCreatedResponse()
    {
        // Arrange
        var data = new { Id = "123", Name = "Test" };

        // Act
        var response = ApiResponse<object>.Created(data);

        // Assert
        Assert.True(response.Success);
        Assert.Equal(data, response.Data);
        Assert.Equal(201, response.StatusCode);
        Assert.Null(response.ErrorMessage);
    }

    [Fact]
    public void ApiResponse_Error_ShouldCreateErrorResponse()
    {
        // Arrange
        var errorMessage = "Something went wrong";

        // Act
        var response = ApiResponse<string>.Error(errorMessage);

        // Assert
        Assert.False(response.Success);
        Assert.Null(response.Data);
        Assert.Equal(500, response.StatusCode);
        Assert.Equal(errorMessage, response.ErrorMessage);
    }

    [Fact]
    public void ApiResponse_NotFound_ShouldCreateNotFoundResponse()
    {
        // Arrange
        var errorMessage = "Resource not found";

        // Act
        var response = ApiResponse<string>.NotFound(errorMessage);

        // Assert
        Assert.False(response.Success);
        Assert.Null(response.Data);
        Assert.Equal(404, response.StatusCode);
        Assert.Equal(errorMessage, response.ErrorMessage);
    }

    [Fact]
    public void ApiResponse_BadRequest_ShouldCreateBadRequestResponse()
    {
        // Arrange
        var errorMessage = "Invalid request";

        // Act
        var response = ApiResponse<string>.BadRequest(errorMessage);

        // Assert
        Assert.False(response.Success);
        Assert.Null(response.Data);
        Assert.Equal(400, response.StatusCode);
        Assert.Equal(errorMessage, response.ErrorMessage);
    }

    [Fact]
    public void ApiResponse_Error_ShouldAllowCustomStatusCode()
    {
        // Arrange
        var errorMessage = "Forbidden";
        var statusCode = 403;

        // Act
        var response = ApiResponse<string>.Error(errorMessage, statusCode);

        // Assert
        Assert.False(response.Success);
        Assert.Equal(statusCode, response.StatusCode);
        Assert.Equal(errorMessage, response.ErrorMessage);
    }
}
