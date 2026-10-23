using System.Text;
using System.Text.Json;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class AdminDashboardService(CvCareerDbContext dbContext)
{
    private const int RecentAnalysisLimit = 1000;
    private const int MaxResultJsonBytes = 1024 * 1024;
    private static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(10);

    public async Task<AdminDashboardStatsDto> GetStatsAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow - PendingTimeout;
        var totalUsers = await dbContext.Users.AsNoTracking().LongCountAsync(cancellationToken);
        var totalCvs = await dbContext.CVs.AsNoTracking().LongCountAsync(cancellationToken);
        var completed = await dbContext.CVAnalyses.AsNoTracking()
            .LongCountAsync(item => item.Status == CvAnalysisStatus.Completed, cancellationToken);
        var explicitFailed = await dbContext.CVAnalyses.AsNoTracking()
            .LongCountAsync(item => item.Status == CvAnalysisStatus.Failed, cancellationToken);
        var expiredPending = await dbContext.CVAnalyses.AsNoTracking().LongCountAsync(
            item => item.Status == CvAnalysisStatus.Pending && item.CreatedAt <= cutoff, cancellationToken);
        var pending = await dbContext.CVAnalyses.AsNoTracking().LongCountAsync(
            item => item.Status == CvAnalysisStatus.Processing
                || (item.Status == CvAnalysisStatus.Pending && item.CreatedAt > cutoff), cancellationToken);

        var revision = await dbContext.CatalogRevisions.AsNoTracking()
            .Where(item => item.RevisionId == 1).Select(item => (long?)item.Version)
            .SingleOrDefaultAsync(cancellationToken) ?? 0;
        var activeJobs = await dbContext.JobPositions.AsNoTracking()
            .CountAsync(item => item.IsActive, cancellationToken);
        var activeSkills = await dbContext.Skills.AsNoTracking()
            .CountAsync(item => item.IsActive, cancellationToken);
        var recentResults = await dbContext.CVAnalyses.AsNoTracking()
            .Where(item => item.Status == CvAnalysisStatus.Completed)
            .OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.AnalysisId)
            .Select(item => item.ResultJson)
            .Take(RecentAnalysisLimit)
            .ToListAsync(cancellationToken);
        var activeNames = await dbContext.JobPositions.AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new { item.Code, item.Name })
            .ToDictionaryAsync(item => item.Code, item => item.Name, StringComparer.Ordinal, cancellationToken);

        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var json in recentResults)
        {
            if (string.IsNullOrEmpty(json) || Encoding.UTF8.GetByteCount(json) > MaxResultJsonBytes)
                continue;
            try
            {
                using var document = JsonDocument.Parse(json, new JsonDocumentOptions { MaxDepth = 16 });
                if (!document.RootElement.TryGetProperty("backendRanking", out var ranking)
                    || ranking.ValueKind != JsonValueKind.Array
                    || ranking.GetArrayLength() == 0)
                    continue;
                var first = ranking[0];
                if (!first.TryGetProperty("jobPositionCode", out var codeElement)
                    || codeElement.ValueKind != JsonValueKind.String)
                    continue;
                var code = codeElement.GetString();
                if (string.IsNullOrWhiteSpace(code) || code.Length > 50)
                    continue;
                counts[code] = counts.GetValueOrDefault(code) + 1;
            }
            catch (JsonException)
            {
                // Skip malformed historical analysis data; never return raw JSON.
            }
            catch (InvalidOperationException)
            {
                // Skip records whose JSON shape is not the current result shape.
            }
        }

        var topJobs = counts.OrderByDescending(item => item.Value).ThenBy(item => item.Key, StringComparer.Ordinal)
            .Take(5)
            .Select(item => new AdminTopJobDto(item.Key, activeNames.GetValueOrDefault(item.Key, item.Key), item.Value))
            .ToArray();

        return new AdminDashboardStatsDto(totalUsers, totalCvs, completed, explicitFailed + expiredPending,
            pending, revision, activeJobs, activeSkills, recentResults.Count, topJobs);
    }
}
