using System.Text.Json.Serialization;

namespace TriviaChallenge.Api.Models;

/// <summary>
/// Represents a question pool/category for organizing questions
/// </summary>
public class QuestionPool
{
    /// <summary>
    /// Unique identifier (slug) for the pool, used as partition key (e.g., "default", "ignite-2026")
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Display name for the pool (e.g., "Default", "Ignite 2026")
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Relative path to the pool's icon (e.g., "/pools/default.svg")
    /// </summary>
    [JsonPropertyName("iconPath")]
    public required string IconPath { get; set; }

    /// <summary>
    /// Optional description of the pool
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Whether the pool is active and available for selection
    /// </summary>
    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Display order for sorting pools in the UI
    /// </summary>
    [JsonPropertyName("displayOrder")]
    public int DisplayOrder { get; set; } = 0;
}
