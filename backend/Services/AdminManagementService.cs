using System.Data;
using System.Text.Json;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class AdminManagementService(CvCareerDbContext dbContext)
{
    private static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(10);
    private static readonly JsonSerializerOptions AuditJsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<PagedAdminUsersDto> GetUsersAsync(
        int page, int pageSize, string? emailContains, CancellationToken cancellationToken)
    {
        ValidatePaging(page, pageSize);
        var filter = emailContains?.Trim();
        if (filter is { Length: > 0 and < 3 })
            throw new AdminRequestException(400, "Từ khóa email cần ít nhất 3 ký tự.");
        if (filter is { Length: > 256 })
            throw new AdminRequestException(400, "Từ khóa email quá dài.");

        var query = dbContext.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(filter))
        {
            var escaped = EscapeLikePattern(filter);
            query = query.Where(user => EF.Functions.Like(user.Email, $"%{escaped}%", "~"));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(user => user.CreatedAt).ThenBy(user => user.UserId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(user => new
            {
                user.UserId, user.Email, user.FullName, user.CreatedAt, user.Role, user.IsActive,
                CvCount = user.Cvs.Count(), user.RowVersion,
            }).ToListAsync(cancellationToken);
        var items = rows.Select(user => new AdminUserDto(user.UserId, user.Email, user.FullName,
            user.CreatedAt, user.Role, user.IsActive, user.CvCount, Convert.ToBase64String(user.RowVersion))).ToArray();
        return new(page, pageSize, total, items);
    }

    public async Task<AdminUserDto> UpdateUserStatusAsync(
        Guid actorId, Guid targetId, UpdateAdminUserStatusRequest request, CancellationToken cancellationToken)
    {
        byte[] expectedRowVersion;
        try { expectedRowVersion = Convert.FromBase64String(request.RowVersion); }
        catch (FormatException) { throw new AdminRequestException(400, "Phiên bản tài khoản không hợp lệ."); }
        if (expectedRowVersion.Length != 8)
            throw new AdminRequestException(400, "Phiên bản tài khoản không hợp lệ.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var actorIsAdmin = await dbContext.Users.AsNoTracking()
            .Where(user => user.UserId == actorId)
            .Select(user => user.IsActive && user.Role == UserRoles.Admin)
            .SingleOrDefaultAsync(cancellationToken);
        if (!actorIsAdmin)
            throw new AdminRequestException(403, "Tài khoản không còn quyền quản trị.");

        var target = await dbContext.Users.SingleOrDefaultAsync(user => user.UserId == targetId, cancellationToken)
            ?? throw new AdminRequestException(404, "Không tìm thấy tài khoản.");
        if (actorId == targetId && !request.IsActive)
            throw new AdminRequestException(409, "Không thể khóa chính tài khoản đang sử dụng.");

        if (target.Role == UserRoles.Admin && target.IsActive && !request.IsActive)
        {
            var otherActiveAdmins = await dbContext.Users.AsNoTracking()
                .CountAsync(user => user.Role == UserRoles.Admin && user.IsActive && user.UserId != targetId,
                    cancellationToken);
            if (otherActiveAdmins == 0)
                throw new AdminRequestException(409, "Không thể khóa Admin đang hoạt động cuối cùng.");
        }

        if (target.IsActive == request.IsActive)
        {
            await transaction.CommitAsync(cancellationToken);
            var existingCvCount = await dbContext.CVs.AsNoTracking()
                .CountAsync(cv => cv.UserId == targetId, cancellationToken);
            return ToDto(target, existingCvCount);
        }

        var before = JsonSerializer.Serialize(new { isActive = target.IsActive, role = target.Role }, AuditJsonOptions);
        dbContext.Entry(target).Property(user => user.RowVersion).OriginalValue = expectedRowVersion;
        target.IsActive = request.IsActive;
        var after = JsonSerializer.Serialize(new { isActive = target.IsActive, role = target.Role }, AuditJsonOptions);
        dbContext.AdminCatalogAuditLogs.Add(new AdminCatalogAuditLog
        {
            ActorUserId = actorId,
            OccurredAt = DateTime.UtcNow,
            Action = request.IsActive ? "Unlock" : "Lock",
            ObjectType = "UserStatus",
            ObjectId = target.UserId.ToString("D"),
            BeforeJson = before,
            AfterJson = after,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var cvCount = await dbContext.CVs.AsNoTracking().CountAsync(cv => cv.UserId == targetId, cancellationToken);
        return ToDto(target, cvCount);
    }

    public async Task<PagedAdminAnalysesDto> GetAnalysesAsync(
        int page, int pageSize, string? status, CancellationToken cancellationToken)
    {
        ValidatePaging(page, pageSize);
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? null : status.Trim();
        if (normalizedStatus is not null && !new[] { "Pending", "Completed", "Failed" }
                .Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
            throw new AdminRequestException(400, "Trạng thái chỉ nhận Pending, Completed hoặc Failed.");

        var cutoff = DateTime.UtcNow - PendingTimeout;
        var query = dbContext.CVAnalyses.AsNoTracking().AsQueryable();
        if (normalizedStatus is not null)
        {
            if (normalizedStatus.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                query = query.Where(item => item.Status == CvAnalysisStatus.Processing
                    || (item.Status == CvAnalysisStatus.Pending && item.CreatedAt > cutoff));
            else if (normalizedStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                query = query.Where(item => item.Status == CvAnalysisStatus.Completed);
            else
                query = query.Where(item => item.Status == CvAnalysisStatus.Failed
                    || (item.Status == CvAnalysisStatus.Pending && item.CreatedAt <= cutoff));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.AnalysisId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new
            {
                item.AnalysisId, item.Status, item.CreatedAt, item.CompletedAt,
                item.OverallScore, item.FailureCode,
            }).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var items = rows.Select(item =>
        {
            var isExpiredPending = item.Status == CvAnalysisStatus.Pending && item.CreatedAt <= cutoff;
            var statusValue = isExpiredPending ? "Failed"
                : item.Status == CvAnalysisStatus.Processing ? "Pending" : item.Status.ToString();
            var failureCode = isExpiredPending ? CvAnalysisFailureCode.AiTimeout.ToString()
                : item.FailureCode?.ToString();
            var durationEnd = item.CompletedAt;
            var duration = durationEnd.HasValue
                ? Math.Max(0, (durationEnd.Value - item.CreatedAt).TotalSeconds)
                : statusValue == "Pending" ? Math.Max(0, (now - item.CreatedAt).TotalSeconds) : (double?)null;
            return new AdminAnalysisDto(item.AnalysisId, statusValue, item.CreatedAt,
                item.CompletedAt, duration, item.OverallScore, failureCode);
        }).ToArray();
        return new(page, pageSize, total, items);
    }

    public static void ValidatePaging(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100
            || (long)(page - 1) * pageSize > int.MaxValue)
            throw new AdminRequestException(400, "page phải từ 1 trở lên và pageSize từ 1 đến 100.");
    }

    private static string EscapeLikePattern(string value) => value
        .Replace("~", "~~", StringComparison.Ordinal)
        .Replace("%", "~%", StringComparison.Ordinal)
        .Replace("_", "~_", StringComparison.Ordinal)
        .Replace("[", "[[]", StringComparison.Ordinal);

    private static AdminUserDto ToDto(User user, int cvCount) => new(user.UserId, user.Email, user.FullName,
        user.CreatedAt, user.Role, user.IsActive, cvCount, Convert.ToBase64String(user.RowVersion));
}

public sealed class AdminRequestException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
