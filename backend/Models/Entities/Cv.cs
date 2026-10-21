namespace CvAdvisor.Api.Models.Entities;

public enum CvSourceType : byte
{
    Upload = 1,
    Manual = 2
}

public sealed class Cv
{
    public Guid CvId { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public CvSourceType SourceType { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? OriginalFileName { get; set; }

    public string? FileExtension { get; set; }

    public string? FileStorageKey { get; set; }

    public string? ContentText { get; set; }

    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<CvAnalysis> Analyses { get; set; } = new List<CvAnalysis>();
}
