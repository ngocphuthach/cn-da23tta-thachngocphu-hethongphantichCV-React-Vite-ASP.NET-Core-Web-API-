using System.ComponentModel.DataAnnotations;

namespace CvAdvisor.Api.Models.Admin;

public sealed record EmployerAdminDto(
    int EmployerId, string Name, string? WebsiteUrl, string? CareersUrl,
    bool IsActive, string RowVersion, int JobPostingCount);

public sealed record EmployerJobAdminDto(
    int EmployerJobPostingId, int EmployerId, string EmployerName, string Title,
    string Location, string Requirements, string SourceUrl, DateTime DeadlineAt,
    bool IsActive, bool IsExpired, string RowVersion, DateTime CreatedAt);

public sealed record EmployerJobOptionDto(
    int EmployerJobPostingId, string EmployerName, string Title, string Location,
    string SourceUrl, DateTime DeadlineAt);

public sealed class CreateEmployerRequest
{
    [Required, StringLength(200)] public string Name { get; init; } = string.Empty;
    [Url, StringLength(500)] public string? WebsiteUrl { get; init; }
    [Url, StringLength(500)] public string? CareersUrl { get; init; }
}

public sealed class UpdateEmployerRequest
{
    [Required, StringLength(200)] public string Name { get; init; } = string.Empty;
    [Url, StringLength(500)] public string? WebsiteUrl { get; init; }
    [Url, StringLength(500)] public string? CareersUrl { get; init; }
    public bool IsActive { get; init; }
    [Required] public string RowVersion { get; init; } = string.Empty;
}

public sealed class CreateEmployerJobRequest
{
    [Range(1, int.MaxValue)] public int EmployerId { get; init; }
    [Required, StringLength(200)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(120)] public string Location { get; init; } = string.Empty;
    [Required, StringLength(20000, MinimumLength = 20)] public string Requirements { get; init; } = string.Empty;
    [Required, Url, StringLength(1000)] public string SourceUrl { get; init; } = string.Empty;
    [Required] public DateTime DeadlineAt { get; init; }
}

public sealed class UpdateEmployerJobRequest
{
    [Required, StringLength(200)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(120)] public string Location { get; init; } = string.Empty;
    [Required, StringLength(20000, MinimumLength = 20)] public string Requirements { get; init; } = string.Empty;
    [Required, Url, StringLength(1000)] public string SourceUrl { get; init; } = string.Empty;
    [Required] public DateTime DeadlineAt { get; init; }
    public bool IsActive { get; init; }
    [Required] public string RowVersion { get; init; } = string.Empty;
}
