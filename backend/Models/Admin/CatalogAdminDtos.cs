using System.ComponentModel.DataAnnotations;

namespace CvAdvisor.Api.Models.Admin;

public sealed record JobPositionAdminDto(
    int JobPositionId,
    string Code,
    string Name,
    string Category,
    string? Description,
    bool IsActive,
    string RowVersion,
    IReadOnlyList<JobPositionSkillAdminDto> Skills,
    IReadOnlyList<string> Warnings);

public sealed record SkillAdminDto(
    int SkillId,
    string Code,
    string Name,
    string Category,
    bool IsActive,
    string RowVersion);

public sealed record JobPositionSkillAdminDto(
    int SkillId,
    string SkillCode,
    string SkillName,
    byte Importance,
    bool IsRequired,
    string RowVersion);

public sealed record CatalogMutationResult<T>(T Item, long CatalogVersion, IReadOnlyList<string> Warnings);

public sealed class CreateJobPositionRequest
{
    [Required, StringLength(50), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    public string Code { get; init; } = string.Empty;
    [Required, StringLength(120)] public string Name { get; init; } = string.Empty;
    [Required, StringLength(60)] public string Category { get; init; } = string.Empty;
    [StringLength(1000)] public string? Description { get; init; }
}

public sealed class UpdateJobPositionRequest
{
    [Required, StringLength(120)] public string Name { get; init; } = string.Empty;
    [Required, StringLength(60)] public string Category { get; init; } = string.Empty;
    [StringLength(1000)] public string? Description { get; init; }
    public bool IsActive { get; init; }
    [Required] public string RowVersion { get; init; } = string.Empty;
}

public sealed class CreateSkillRequest
{
    [Required, StringLength(60), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    public string Code { get; init; } = string.Empty;
    [Required, StringLength(100)] public string Name { get; init; } = string.Empty;
    [Required, StringLength(60)] public string Category { get; init; } = string.Empty;
}

public sealed class UpdateSkillRequest
{
    [Required, StringLength(100)] public string Name { get; init; } = string.Empty;
    [Required, StringLength(60)] public string Category { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    [Required] public string RowVersion { get; init; } = string.Empty;
}

public sealed class UpdatePositionSkillRequest
{
    [Range(1, 5)] public byte Importance { get; init; }
    public bool IsRequired { get; init; }
    public string? RowVersion { get; init; }
}

public sealed record CatalogAuditDto(
    long AuditId,
    Guid ActorUserId,
    DateTime OccurredAt,
    string Action,
    string ObjectType,
    string ObjectId,
    string? BeforeJson,
    string? AfterJson);

public sealed record PagedCatalogAuditResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<CatalogAuditDto> Items);
