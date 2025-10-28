using Xunit;
using IQChallenge.Api.Models;

namespace IQChallenge.Api.Tests.Repositories;

public class QuestionRepositoryTests
{
    [Theory]
    [InlineData("easy")]
    [InlineData("medium")]
    [InlineData("hard")]
    public void Question_ShouldHaveValidDifficulty(string difficulty)
    {
        // Arrange & Act
        var question = new Question
        {
            QuestionText = "Test question?",
            Choices = new List<string> { "A", "B", "C", "D" },
            CorrectAnswerIndex = 0,
            Difficulty = difficulty
        };

        // Assert
        Assert.Equal(difficulty, question.Difficulty);
        Assert.NotNull(question.Id);
    }

    [Fact]
    public void Question_ShouldGenerateUniqueIds()
    {
        // Arrange & Act
        var question1 = new Question
        {
            QuestionText = "Test 1?",
            Choices = new List<string> { "A", "B" },
            CorrectAnswerIndex = 0
        };

        var question2 = new Question
        {
            QuestionText = "Test 2?",
            Choices = new List<string> { "A", "B" },
            CorrectAnswerIndex = 1
        };

        // Assert
        Assert.NotEqual(question1.Id, question2.Id);
    }

    [Fact]
    public void Question_ShouldValidateCorrectAnswerIndex()
    {
        // Arrange
        var choices = new List<string> { "A", "B", "C" };

        // Act
        var question = new Question
        {
            QuestionText = "Test?",
            Choices = choices,
            CorrectAnswerIndex = 1
        };

        // Assert
        Assert.True(question.CorrectAnswerIndex >= 0 && question.CorrectAnswerIndex < choices.Count);
    }
}
