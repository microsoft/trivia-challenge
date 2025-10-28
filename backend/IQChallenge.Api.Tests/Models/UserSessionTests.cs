using Xunit;
using IQChallenge.Api.Models;

namespace IQChallenge.Api.Tests.Models;

public class UserSessionTests
{
    [Fact]
    public void UserSession_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var session = new UserSession
        {
            UserId = "test-user-id",
            DisplayName = "Test User"
        };

        // Assert
        Assert.Equal("test-user-id", session.UserId);
        Assert.Equal("Test User", session.DisplayName);
        Assert.Equal("created", session.Status);
        Assert.Equal(0, session.TotalScore);
        Assert.Equal(0, session.CurrentStreak);
        Assert.Equal("easy", session.CurrentDifficulty);
        Assert.Equal(60, session.RemainingTime); // Base 1 minute
        Assert.NotNull(session.Id);
        Assert.NotNull(session.QuestionIds);
        Assert.Empty(session.QuestionIds);
    }

    [Fact]
    public void UserSession_ShouldGenerateUniqueIds()
    {
        // Arrange & Act
        var session1 = new UserSession
        {
            UserId = "user1",
            DisplayName = "User 1"
        };

        var session2 = new UserSession
        {
            UserId = "user2",
            DisplayName = "User 2"
        };

        // Assert
        Assert.NotEqual(session1.Id, session2.Id);
    }

    [Theory]
    [InlineData("created")]
    [InlineData("active")]
    [InlineData("completed")]
    public void UserSession_ShouldAllowValidStatuses(string status)
    {
        // Arrange & Act
        var session = new UserSession
        {
            UserId = "test-user",
            DisplayName = "Test",
            Status = status
        };

        // Assert
        Assert.Equal(status, session.Status);
    }

    [Fact]
    public void UserSession_ShouldTrackQuestions()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = "test-user",
            DisplayName = "Test"
        };

        // Act
        session.QuestionIds.Add("q1");
        session.QuestionIds.Add("q2");
        session.QuestionIds.Add("q3");

        // Assert
        Assert.Equal(3, session.QuestionIds.Count);
        Assert.Contains("q1", session.QuestionIds);
        Assert.Contains("q2", session.QuestionIds);
        Assert.Contains("q3", session.QuestionIds);
    }

    [Fact]
    public void UserSession_ShouldCalculateScoreCorrectly()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = "test-user",
            DisplayName = "Test"
        };

        // Act
        session.TotalScore += 10; // Easy question
        session.TotalScore += 20; // Medium question
        session.TotalScore += 30; // Hard question

        // Assert
        Assert.Equal(60, session.TotalScore);
    }

    [Fact]
    public void UserSession_ShouldTrackStreak()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = "test-user",
            DisplayName = "Test"
        };

        // Act
        session.CurrentStreak = 5;
        session.CorrectAnswers = 5;

        // Assert
        Assert.Equal(5, session.CurrentStreak);
        Assert.Equal(5, session.CorrectAnswers);
    }

    [Fact]
    public void UserSession_ShouldUpdateDifficultyBasedOnStreak()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = "test-user",
            DisplayName = "Test"
        };

        // Act - Simulate progression
        session.CurrentStreak = 5;
        session.CurrentDifficulty = "medium";

        // Assert
        Assert.Equal("medium", session.CurrentDifficulty);
        Assert.Equal(5, session.CurrentStreak);
    }
}
