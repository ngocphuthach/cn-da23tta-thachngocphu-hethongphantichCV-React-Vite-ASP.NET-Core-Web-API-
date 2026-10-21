using System.Text.Json;
using CvAdvisor.Api.Models.Entities;

namespace CvAdvisor.Api.Models.Cvs;

public sealed record CvAnalysisListDto(
    Guid AnalysisId,
    Guid CvId,
    DateTime CreatedAt,
    string Status,
    decimal? OverallScore,
    string? BestJobPositionCode);

public sealed record CvAnalysisDetailDto(
    Guid AnalysisId,
    Guid CvId,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    string Status,
    decimal? OverallScore,
    JsonElement? Result);

public sealed record PagedCvAnalysisResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<CvAnalysisListDto> Items);

public sealed record CvAnalysisStartedDto(
    Guid AnalysisId,
    string Status,
    string Message);

public sealed record CvAnalysisRankingEntry(
    string JobPositionCode,
    string JobPositionName,
    decimal? BackendFitScore);
