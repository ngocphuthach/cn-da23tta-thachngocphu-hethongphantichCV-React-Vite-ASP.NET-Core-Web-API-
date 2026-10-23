namespace CvAdvisor.Api.Models.Admin;

public sealed record AdminDashboardStatsDto(
    long TotalUsers,
    long TotalCvs,
    long CompletedAnalyses,
    long FailedAnalyses,
    long PendingAnalyses,
    long CatalogVersion,
    int ActiveJobPositionCount,
    int ActiveSkillCount,
    int ScannedCompletedAnalyses,
    IReadOnlyList<AdminTopJobDto> TopJobs);

public sealed record AdminTopJobDto(string JobPositionCode, string JobPositionName, int Count);
