using System.Data;
using System.Text.Json;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class EmployerJobService(CvCareerDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<EmployerAdminDto>> ListEmployersAsync(CancellationToken ct)
    {
        var rows = await db.Employers.AsNoTracking().OrderBy(item => item.Name).Take(200)
            .Select(item => new
            {
                item.EmployerId, item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive,
                item.RowVersion, JobPostingCount = item.JobPostings.Count,
            }).ToListAsync(ct);
        return rows.Select(item => new EmployerAdminDto(item.EmployerId, item.Name, item.WebsiteUrl,
            item.CareersUrl, item.IsActive, Convert.ToBase64String(item.RowVersion), item.JobPostingCount)).ToArray();
    }

    public async Task<IReadOnlyList<EmployerJobAdminDto>> ListPostingsAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var rows = await db.EmployerJobPostings.AsNoTracking().OrderByDescending(item => item.CreatedAt).Take(500)
            .Select(item => new
            {
                item.EmployerJobPostingId, item.EmployerId, EmployerName = item.Employer.Name,
                item.Title, item.Location, item.Requirements, item.SourceUrl, item.DeadlineAt,
                item.IsActive, item.RowVersion, item.CreatedAt,
            }).ToListAsync(ct);
        return rows.Select(item => new EmployerJobAdminDto(item.EmployerJobPostingId, item.EmployerId,
            item.EmployerName, item.Title, item.Location, item.Requirements, item.SourceUrl,
            item.DeadlineAt, item.IsActive, item.DeadlineAt <= now,
            Convert.ToBase64String(item.RowVersion), item.CreatedAt)).ToArray();
    }

    public async Task<IReadOnlyList<EmployerJobOptionDto>> ListAvailableAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return await db.EmployerJobPostings.AsNoTracking()
            .Where(item => item.IsActive && item.Employer.IsActive && item.DeadlineAt > now)
            .OrderBy(item => item.Employer.Name).ThenBy(item => item.Title)
            .Take(500)
            .Select(item => new EmployerJobOptionDto(item.EmployerJobPostingId, item.Employer.Name,
                item.Title, item.Location, item.SourceUrl, item.DeadlineAt))
            .ToListAsync(ct);
    }

    public async Task<EmployerAdminDto> CreateEmployerAsync(Guid actorId, CreateEmployerRequest request, CancellationToken ct)
    {
        ValidateName(request.Name, 200);
        ValidateOptionalUrl(request.WebsiteUrl, 500);
        ValidateOptionalUrl(request.CareersUrl, 500);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var name = request.Name.Trim();
        if (await db.Employers.AnyAsync(item => item.Name == name, ct))
            throw new EmployerAdminException(409, "Nhà tuyển dụng này đã tồn tại.");
        var item = new Employer
        {
            Name = name,
            WebsiteUrl = NormalizeOptional(request.WebsiteUrl),
            CareersUrl = NormalizeOptional(request.CareersUrl),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        db.Employers.Add(item);
        AddAudit(actorId, "Create", "Employer", item.EmployerId.ToString(), null,
            new { item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(item.EmployerId, item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive,
            Convert.ToBase64String(item.RowVersion), 0);
    }

    public async Task<EmployerAdminDto> UpdateEmployerAsync(Guid actorId, int id, UpdateEmployerRequest request, CancellationToken ct)
    {
        ValidateName(request.Name, 200);
        ValidateOptionalUrl(request.WebsiteUrl, 500);
        ValidateOptionalUrl(request.CareersUrl, 500);
        var version = ParseRowVersion(request.RowVersion);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var item = await db.Employers.SingleOrDefaultAsync(value => value.EmployerId == id, ct)
            ?? throw new EmployerAdminException(404, "Không tìm thấy nhà tuyển dụng.");
        var name = request.Name.Trim();
        if (await db.Employers.AnyAsync(value => value.EmployerId != id && value.Name == name, ct))
            throw new EmployerAdminException(409, "Tên nhà tuyển dụng đã được sử dụng.");
        var before = new { item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive };
        db.Entry(item).Property(value => value.RowVersion).OriginalValue = version;
        item.Name = name;
        item.WebsiteUrl = NormalizeOptional(request.WebsiteUrl);
        item.CareersUrl = NormalizeOptional(request.CareersUrl);
        item.IsActive = request.IsActive;
        AddAudit(actorId, "Update", "Employer", item.EmployerId.ToString(), before,
            new { item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var count = await db.EmployerJobPostings.CountAsync(value => value.EmployerId == id, ct);
        return new(item.EmployerId, item.Name, item.WebsiteUrl, item.CareersUrl, item.IsActive,
            Convert.ToBase64String(item.RowVersion), count);
    }

    public async Task<EmployerJobAdminDto> CreatePostingAsync(Guid actorId, CreateEmployerJobRequest request, CancellationToken ct)
    {
        ValidatePosting(request.Title, request.Location, request.Requirements, request.SourceUrl, request.DeadlineAt);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var employer = await db.Employers.SingleOrDefaultAsync(item => item.EmployerId == request.EmployerId && item.IsActive, ct)
            ?? throw new EmployerAdminException(404, "Hãy chọn nhà tuyển dụng đang hoạt động.");
        var item = new EmployerJobPosting
        {
            EmployerId = employer.EmployerId,
            Title = request.Title.Trim(),
            Location = request.Location.Trim(),
            Requirements = request.Requirements.Trim(),
            SourceUrl = request.SourceUrl.Trim(),
            DeadlineAt = NormalizeDeadline(request.DeadlineAt),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        db.EmployerJobPostings.Add(item);
        AddAudit(actorId, "Create", "EmployerJobPosting", item.EmployerJobPostingId.ToString(), null, AuditValue(item));
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ToPostingDto(item, employer.Name);
    }

    public async Task<EmployerJobAdminDto> UpdatePostingAsync(Guid actorId, int id, UpdateEmployerJobRequest request, CancellationToken ct)
    {
        ValidatePosting(request.Title, request.Location, request.Requirements, request.SourceUrl, request.DeadlineAt);
        var version = ParseRowVersion(request.RowVersion);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var item = await db.EmployerJobPostings.Include(value => value.Employer)
            .SingleOrDefaultAsync(value => value.EmployerJobPostingId == id, ct)
            ?? throw new EmployerAdminException(404, "Không tìm thấy tin tuyển dụng.");
        var before = AuditValue(item);
        db.Entry(item).Property(value => value.RowVersion).OriginalValue = version;
        item.Title = request.Title.Trim();
        item.Location = request.Location.Trim();
        item.Requirements = request.Requirements.Trim();
        item.SourceUrl = request.SourceUrl.Trim();
        item.DeadlineAt = NormalizeDeadline(request.DeadlineAt);
        item.IsActive = request.IsActive;
        AddAudit(actorId, "Update", "EmployerJobPosting", item.EmployerJobPostingId.ToString(), before, AuditValue(item));
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ToPostingDto(item, item.Employer.Name);
    }

    public async Task<EmployerJobPosting?> GetMatchablePostingAsync(int id, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return await db.EmployerJobPostings.AsNoTracking()
            .Include(item => item.Employer)
            .SingleOrDefaultAsync(item => item.EmployerJobPostingId == id && item.IsActive
                && item.Employer.IsActive && item.DeadlineAt > now, ct);
    }

    private async Task EnsureAdminAsync(Guid actorId, CancellationToken ct)
    {
        var allowed = await db.Users.AsNoTracking().Where(user => user.UserId == actorId)
            .Select(user => user.IsActive && user.Role == UserRoles.Admin).SingleOrDefaultAsync(ct);
        if (!allowed) throw new EmployerAdminException(403, "Tài khoản không còn quyền quản trị.");
    }

    private void AddAudit(Guid actorId, string action, string type, string id, object? before, object? after)
    {
        var beforeJson = before is null ? null : JsonSerializer.Serialize(before, JsonOptions);
        var afterJson = after is null ? null : JsonSerializer.Serialize(after, JsonOptions);
        if ((beforeJson?.Length ?? 0) > 8000 || (afterJson?.Length ?? 0) > 8000)
            throw new EmployerAdminException(400, "Thông tin thay đổi vượt giới hạn nhật ký.");
        db.AdminCatalogAuditLogs.Add(new AdminCatalogAuditLog
        {
            ActorUserId = actorId, OccurredAt = DateTime.UtcNow, Action = action,
            ObjectType = type, ObjectId = id, BeforeJson = beforeJson, AfterJson = afterJson,
        });
    }

    private static EmployerJobAdminDto ToPostingDto(EmployerJobPosting item, string employerName) =>
        new(item.EmployerJobPostingId, item.EmployerId, employerName, item.Title, item.Location,
            item.Requirements, item.SourceUrl, item.DeadlineAt, item.IsActive,
            item.DeadlineAt <= DateTime.UtcNow, Convert.ToBase64String(item.RowVersion), item.CreatedAt);

    private static object AuditValue(EmployerJobPosting item) => new
    {
        item.EmployerId, item.Title, item.Location, item.SourceUrl, item.DeadlineAt, item.IsActive,
        RequirementsLength = item.Requirements.Length,
    };

    private static DateTime NormalizeDeadline(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc) return value;
        // A date-only value from the admin form remains valid through the end of that day.
        return DateTime.SpecifyKind(value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ValidateName(string value, int max)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > max || value.Any(char.IsControl))
            throw new EmployerAdminException(400, "Tên nhà tuyển dụng không hợp lệ.");
    }

    private static void ValidateOptionalUrl(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        ValidateHttpsUrl(value.Trim(), max);
    }

    private static void ValidatePosting(string title, string location, string requirements, string url, DateTime deadline)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 200 || title.Any(char.IsControl)
            || string.IsNullOrWhiteSpace(location) || location.Trim().Length > 120 || location.Any(char.IsControl)
            || string.IsNullOrWhiteSpace(requirements) || requirements.Trim().Length is < 20 or > 20000
            || string.IsNullOrWhiteSpace(url))
            throw new EmployerAdminException(400, "Thông tin tin tuyển dụng không hợp lệ hoặc vượt giới hạn.");
        ValidateHttpsUrl(url.Trim(), 1000);
        if (deadline == default) throw new EmployerAdminException(400, "Tin tuyển dụng cần có hạn nộp để tự ngừng hiển thị.");
        if (requirements.Any(character => character == '\0'))
            throw new EmployerAdminException(400, "Yêu cầu tuyển dụng chứa ký tự không hợp lệ.");
    }

    private static void ValidateHttpsUrl(string value, int max)
    {
        if (value.Length > max || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps || string.IsNullOrWhiteSpace(uri.Host))
            throw new EmployerAdminException(400, "URL nguồn phải là địa chỉ HTTPS hợp lệ.");
    }

    private static byte[] ParseRowVersion(string value)
    {
        try
        {
            var bytes = Convert.FromBase64String(value);
            return bytes.Length == 8 ? bytes : throw new FormatException();
        }
        catch (FormatException) { throw new EmployerAdminException(400, "Mã phiên bản dữ liệu không hợp lệ."); }
    }
}

public sealed class EmployerAdminException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
