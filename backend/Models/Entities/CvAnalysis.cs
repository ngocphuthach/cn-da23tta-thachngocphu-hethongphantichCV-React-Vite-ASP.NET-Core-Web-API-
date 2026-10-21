namespace CvAdvisor.Api.Models.Entities;

public enum CvAnalysisStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}

public sealed class CvAnalysis
{
    public Guid AnalysisId { get; set; } = Guid.NewGuid();

    public Guid CvId { get; set; }

    public CvAnalysisStatus Status { get; set; } = CvAnalysisStatus.Pending;

    public decimal? OverallScore { get; set; }

    public string? AiProvider { get; set; }

    public string? ModelName { get; set; }

    public string? ResultJson { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public Cv Cv { get; set; } = null!;
}
