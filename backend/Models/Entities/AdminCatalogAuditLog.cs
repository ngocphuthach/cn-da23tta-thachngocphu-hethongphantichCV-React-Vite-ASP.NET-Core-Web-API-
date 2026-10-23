namespace CvAdvisor.Api.Models.Entities;

public sealed class AdminCatalogAuditLog
{
    public long AuditId { get; set; }

    public Guid ActorUserId { get; set; }

    public DateTime OccurredAt { get; set; }

    public string Action { get; set; } = string.Empty;

    public string ObjectType { get; set; } = string.Empty;

    public string ObjectId { get; set; } = string.Empty;

    public string? BeforeJson { get; set; }

    public string? AfterJson { get; set; }

    public User Actor { get; set; } = null!;
}
