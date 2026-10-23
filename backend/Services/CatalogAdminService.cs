using System.Data;
using System.Text.Json;
using System.Text.RegularExpressions;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed partial class CatalogAdminService(CvCareerDbContext dbContext)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<JobPositionAdminDto>> GetJobPositionsAsync(bool includeInactive, CancellationToken ct)
    {
        var query = dbContext.JobPositions.AsNoTracking().AsQueryable();
        if (!includeInactive) query = query.Where(item => item.IsActive);
        var positions = await query.Include(item => item.JobPositionSkills).ThenInclude(link => link.Skill)
            .OrderBy(item => item.Name).Take(200).ToListAsync(ct);
        return positions.Select(ToPositionDto).ToArray();
    }

    public async Task<IReadOnlyList<SkillAdminDto>> GetSkillsAsync(bool includeInactive, CancellationToken ct)
    {
        var query = dbContext.Skills.AsNoTracking().AsQueryable();
        if (!includeInactive) query = query.Where(item => item.IsActive);
        return (await query.OrderBy(item => item.Name).Take(500).ToListAsync(ct))
            .Select(ToSkillDto).ToArray();
    }

    public async Task<CatalogMutationResult<JobPositionAdminDto>> CreateJobPositionAsync(
        Guid actorId, CreateJobPositionRequest request, CancellationToken ct)
    {
        var code = request.Code.Trim();
        ValidateCode(code, 50);
        ValidateText(request.Name, 120, required: true);
        ValidateText(request.Category, 60, required: true);
        ValidateText(request.Description, 1000, required: false);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        if (await dbContext.JobPositions.AnyAsync(item => item.Code == code, ct))
            throw new CatalogAdminException(409, "Mã nghề đã tồn tại.");

        var position = new JobPosition
        {
            Code = code,
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true,
        };
        dbContext.JobPositions.Add(position);
        await AddAuditAsync(actorId, "Create", "JobPosition", code, null, position, ct);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(ToPositionDto(position), version, GetWarnings(position));
    }

    public async Task<CatalogMutationResult<JobPositionAdminDto>> UpdateJobPositionAsync(
        Guid actorId, int id, UpdateJobPositionRequest request, CancellationToken ct)
    {
        ValidateText(request.Name, 120, required: true);
        ValidateText(request.Category, 60, required: true);
        ValidateText(request.Description, 1000, required: false);
        var rowVersion = ParseRowVersion(request.RowVersion);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var item = await dbContext.JobPositions.Include(value => value.JobPositionSkills)
            .ThenInclude(link => link.Skill).SingleOrDefaultAsync(value => value.JobPositionId == id, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy nghề.");
        var before = PositionAuditValue(item);
        dbContext.Entry(item).Property(value => value.RowVersion).OriginalValue = rowVersion;
        item.Name = request.Name.Trim();
        item.Category = request.Category.Trim();
        item.Description = request.Description?.Trim();
        item.IsActive = request.IsActive;
        await AddAuditAsync(actorId, "Update", "JobPosition", item.Code, before, PositionAuditValue(item), ct);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(ToPositionDto(item), version, GetWarnings(item));
    }

    public async Task<CatalogMutationResult<SkillAdminDto>> CreateSkillAsync(
        Guid actorId, CreateSkillRequest request, CancellationToken ct)
    {
        var code = request.Code.Trim();
        ValidateCode(code, 60);
        ValidateText(request.Name, 100, required: true);
        ValidateText(request.Category, 60, required: true);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        if (await dbContext.Skills.AnyAsync(item => item.Code == code, ct))
            throw new CatalogAdminException(409, "Mã kỹ năng đã tồn tại.");

        var skill = new Skill { Code = code, Name = request.Name.Trim(), Category = request.Category.Trim(), IsActive = true };
        dbContext.Skills.Add(skill);
        await AddAuditAsync(actorId, "Create", "Skill", code, null, skill, ct);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(ToSkillDto(skill), version, []);
    }

    public async Task<CatalogMutationResult<SkillAdminDto>> UpdateSkillAsync(
        Guid actorId, int id, UpdateSkillRequest request, CancellationToken ct)
    {
        ValidateText(request.Name, 100, required: true);
        ValidateText(request.Category, 60, required: true);
        var rowVersion = ParseRowVersion(request.RowVersion);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var item = await dbContext.Skills.SingleOrDefaultAsync(value => value.SkillId == id, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy kỹ năng.");
        var before = SkillAuditValue(item);
        dbContext.Entry(item).Property(value => value.RowVersion).OriginalValue = rowVersion;
        item.Name = request.Name.Trim();
        item.Category = request.Category.Trim();
        item.IsActive = request.IsActive;
        await AddAuditAsync(actorId, "Update", "Skill", item.Code, before, SkillAuditValue(item), ct);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(ToSkillDto(item), version, []);
    }

    public async Task<CatalogMutationResult<JobPositionAdminDto>> UpsertPositionSkillAsync(
        Guid actorId, int positionId, int skillId, UpdatePositionSkillRequest request, CancellationToken ct)
    {
        if (request.Importance is < 1 or > 5)
            throw new CatalogAdminException(400, "Importance phải từ 1 đến 5.");
        var rowVersion = request.RowVersion is null ? null : ParseRowVersion(request.RowVersion);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var position = await dbContext.JobPositions.Include(value => value.JobPositionSkills)
            .ThenInclude(link => link.Skill).SingleOrDefaultAsync(value => value.JobPositionId == positionId, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy nghề.");
        var skill = await dbContext.Skills.SingleOrDefaultAsync(value => value.SkillId == skillId && value.IsActive, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy kỹ năng đang hoạt động.");
        var link = await dbContext.JobPositionSkills.SingleOrDefaultAsync(
            value => value.JobPositionId == positionId && value.SkillId == skillId, ct);
        object? before = link is null ? null : LinkAuditValue(link);
        if (link is null)
        {
            if (rowVersion is not null) throw new CatalogAdminException(400, "Không nhận RowVersion khi tạo liên kết mới.");
            link = new JobPositionSkill { JobPositionId = positionId, SkillId = skillId };
            dbContext.JobPositionSkills.Add(link);
        }
        else
        {
            if (rowVersion is null) throw new CatalogAdminException(400, "Thiếu RowVersion của liên kết.");
            dbContext.Entry(link).Property(value => value.RowVersion).OriginalValue = rowVersion;
        }
        link.JobPosition = position;
        link.Skill = skill;
        link.Importance = request.Importance;
        link.IsRequired = request.IsRequired;
        await AddAuditAsync(actorId, before is null ? "Link" : "Update", "JobPositionSkill",
            $"{position.Code}/{skill.Code}", before, LinkAuditValue(link), ct);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(ToPositionDto(position), version, GetWarnings(position));
    }

    public async Task<CatalogMutationResult<JobPositionAdminDto>> DeletePositionSkillAsync(
        Guid actorId, int positionId, int skillId, string rowVersionText, CancellationToken ct)
    {
        var rowVersion = ParseRowVersion(rowVersionText);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await EnsureAdminAsync(actorId, ct);
        var position = await dbContext.JobPositions.Include(value => value.JobPositionSkills)
            .ThenInclude(link => link.Skill).SingleOrDefaultAsync(value => value.JobPositionId == positionId, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy nghề.");
        var link = await dbContext.JobPositionSkills.SingleOrDefaultAsync(
            value => value.JobPositionId == positionId && value.SkillId == skillId, ct)
            ?? throw new CatalogAdminException(404, "Không tìm thấy liên kết nghề-kỹ năng.");
        dbContext.Entry(link).Property(value => value.RowVersion).OriginalValue = rowVersion;
        await AddAuditAsync(actorId, "Unlink", "JobPositionSkill", $"{position.Code}/{skillId}", LinkAuditValue(link), null, ct);
        dbContext.JobPositionSkills.Remove(link);
        var version = await BumpRevisionAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        position.JobPositionSkills.Remove(link);
        return new(ToPositionDto(position), version, GetWarnings(position));
    }

    public async Task<PagedCatalogAuditResponse> GetAuditAsync(int page, int pageSize, CancellationToken ct)
    {
        AdminManagementService.ValidatePaging(page, pageSize);
        var query = dbContext.AdminCatalogAuditLogs.AsNoTracking();
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(item => item.OccurredAt).ThenByDescending(item => item.AuditId)
            .Skip((page - 1) * pageSize).Take(pageSize).Select(item => new CatalogAuditDto(
                item.AuditId, item.ActorUserId, item.OccurredAt, item.Action, item.ObjectType,
                item.ObjectId, item.BeforeJson, item.AfterJson)).ToListAsync(ct);
        return new(page, pageSize, total, rows);
    }

    private async Task EnsureAdminAsync(Guid actorId, CancellationToken ct)
    {
        var isAdmin = await dbContext.Users.AsNoTracking()
            .Where(user => user.UserId == actorId)
            .Select(user => user.IsActive && user.Role == UserRoles.Admin)
            .SingleOrDefaultAsync(ct);
        if (!isAdmin) throw new CatalogAdminException(403, "Tài khoản không còn quyền quản trị.");
    }

    private async Task<long> BumpRevisionAsync(CancellationToken ct)
    {
        var revision = await dbContext.CatalogRevisions.SingleOrDefaultAsync(item => item.RevisionId == 1, ct)
            ?? throw new CatalogAdminException(503, "Chưa khởi tạo phiên bản danh mục; hãy kiểm tra migration.");
        revision.Version++;
        return revision.Version;
    }

    private async Task AddAuditAsync(Guid actorId, string action, string objectType, string objectId,
        object? before, object? after, CancellationToken ct)
    {
        var beforeJson = before is null ? null : JsonSerializer.Serialize(before, JsonOptions);
        var afterJson = after is null ? null : JsonSerializer.Serialize(after, JsonOptions);
        if ((beforeJson?.Length ?? 0) > 8000 || (afterJson?.Length ?? 0) > 8000)
            throw new CatalogAdminException(400, "Thông tin thay đổi vượt giới hạn audit.");
        dbContext.AdminCatalogAuditLogs.Add(new AdminCatalogAuditLog
        {
            ActorUserId = actorId, OccurredAt = DateTime.UtcNow, Action = action,
            ObjectType = objectType, ObjectId = objectId, BeforeJson = beforeJson, AfterJson = afterJson,
        });
        await Task.CompletedTask;
    }

    private static JobPositionAdminDto ToPositionDto(JobPosition item)
    {
        var skills = item.JobPositionSkills.OrderBy(link => link.Skill.Name)
            .Select(link => new JobPositionSkillAdminDto(link.SkillId, link.Skill.Code, link.Skill.Name,
                link.Importance, link.IsRequired, Convert.ToBase64String(link.RowVersion))).ToArray();
        return new(item.JobPositionId, item.Code, item.Name, item.Category, item.Description, item.IsActive,
            Convert.ToBase64String(item.RowVersion), skills, GetWarnings(item));
    }

    private static SkillAdminDto ToSkillDto(Skill item) => new(item.SkillId, item.Code, item.Name,
        item.Category, item.IsActive, Convert.ToBase64String(item.RowVersion));

    private static string[] GetWarnings(JobPosition item)
    {
        var requiredActive = item.JobPositionSkills.Where(link => link.IsRequired && link.Skill.IsActive).ToArray();
        if (requiredActive.Length == 0 || requiredActive.Sum(link => (int)link.Importance) == 0)
            return ["Nghề này chưa có kỹ năng bắt buộc đang hoạt động; điểm khớp có thể là N/A."];
        return [];
    }

    private static object PositionAuditValue(JobPosition item) => new
    {
        item.Name, item.Category, item.Description, item.IsActive,
        Skills = item.JobPositionSkills.Select(LinkAuditValue).ToArray(),
    };
    private static object SkillAuditValue(Skill item) => new { item.Name, item.Category, item.IsActive };
    private static object LinkAuditValue(JobPositionSkill item) => new { item.Importance, item.IsRequired };

    private static byte[] ParseRowVersion(string value)
    {
        try
        {
            var bytes = Convert.FromBase64String(value);
            if (bytes.Length != 8) throw new FormatException();
            return bytes;
        }
        catch (FormatException) { throw new CatalogAdminException(400, "RowVersion không hợp lệ."); }
    }

    private static void ValidateCode(string code, int maxLength)
    {
        if (code.Length is 0 || code.Length > maxLength || !CodePattern().IsMatch(code))
            throw new CatalogAdminException(400, "Mã chỉ được gồm chữ thường, số và gạch ngang; không được bắt đầu hoặc kết thúc bằng gạch ngang.");
    }

    private static void ValidateText(string? value, int maxLength, bool required)
    {
        if (value is null)
        {
            if (required) throw new CatalogAdminException(400, "Thiếu trường bắt buộc.");
            return;
        }
        if (value.Trim().Length > maxLength || (required && string.IsNullOrWhiteSpace(value))
            || value.Any(char.IsControl))
            throw new CatalogAdminException(400, "Giá trị danh mục không hợp lệ hoặc vượt giới hạn độ dài.");
    }

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex CodePattern();
}

public sealed class CatalogAdminException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
