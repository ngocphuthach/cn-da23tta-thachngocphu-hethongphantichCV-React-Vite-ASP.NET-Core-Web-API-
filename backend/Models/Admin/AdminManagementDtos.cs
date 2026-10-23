using System.ComponentModel.DataAnnotations;

namespace CvAdvisor.Api.Models.Admin;

public sealed record AdminUserDto(
    Guid UserId,
    string Email,
    string FullName,
    DateTime CreatedAt,
    string Role,
    bool IsActive,
    int CvCount,
    string RowVersion);

public sealed record PagedAdminUsersDto(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<AdminUserDto> Items);

public sealed class UpdateAdminUserStatusRequest
{
    public bool IsActive { get; init; }
    [Required] public string RowVersion { get; init; } = string.Empty;
}

public sealed record AdminAnalysisDto(
    Guid AnalysisId,
    string Status,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    double? DurationSeconds,
    decimal? OverallScore,
    string? FailureCode);

public sealed record PagedAdminAnalysesDto(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<AdminAnalysisDto> Items);
