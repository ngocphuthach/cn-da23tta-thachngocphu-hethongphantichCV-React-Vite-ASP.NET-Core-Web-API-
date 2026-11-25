using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class AdminCvService(CvCareerDbContext dbContext)
{
    private static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(10);

    public async Task<PagedAdminCvsDto> GetCvsAsync(
        int page, int pageSize, string? sourceType, CancellationToken cancellationToken)
    {
        AdminManagementService.ValidatePaging(page, pageSize);
        var normalizedSource = string.IsNullOrWhiteSpace(sourceType) ? null : sourceType.Trim();
        CvSourceType? source = normalizedSource?.ToLowerInvariant() switch
        {
            null => null,
            "upload" => CvSourceType.Upload,
            "manual" => CvSourceType.Manual,
            _ => throw new AdminRequestException(400, "sourceType chỉ nhận Upload hoặc Manual."),
        };

        var query = dbContext.CVs.AsNoTracking().AsQueryable();
        if (source.HasValue)
            query = query.Where(item => item.SourceType == source.Value);

        var total = await query.LongCountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.CvId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new
            {
                item.CvId,
                item.UserId,
                item.SourceType,
                item.CreatedAt,
                AnalysisCount = item.Analyses.Count(),
                LatestStatus = item.Analyses.OrderByDescending(analysis => analysis.CreatedAt)
                    .ThenByDescending(analysis => analysis.AnalysisId)
                    .Select(analysis => (CvAnalysisStatus?)analysis.Status).FirstOrDefault(),
                LatestAnalysisAt = item.Analyses.OrderByDescending(analysis => analysis.CreatedAt)
                    .ThenByDescending(analysis => analysis.AnalysisId)
                    .Select(analysis => (DateTime?)analysis.CreatedAt).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var items = rows.Select(item =>
        {
            var expiredPending = item.LatestStatus == CvAnalysisStatus.Pending
                && item.LatestAnalysisAt is { } latestAt
                && latestAt <= now - PendingTimeout;
            var status = expiredPending ? "Failed" : item.LatestStatus switch
            {
                CvAnalysisStatus.Processing => "Pending",
                { } value => value.ToString(),
                _ => null,
            };
            return new AdminCvDto(
                item.CvId,
                item.UserId,
                item.SourceType.ToString(),
                item.CreatedAt,
                item.AnalysisCount,
                status,
                item.LatestAnalysisAt);
        }).ToArray();

        return new PagedAdminCvsDto(page, pageSize, checked((int)Math.Min(total, int.MaxValue)), items);
    }
}
