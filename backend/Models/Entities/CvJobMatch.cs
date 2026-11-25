namespace CvAdvisor.Api.Models.Entities;

public sealed class CvJobMatch
{
    public Guid MatchId { get; set; } = Guid.NewGuid();

    public Guid CvId { get; set; }

    public int? EmployerJobPostingId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string PositionTitle { get; set; } = string.Empty;

    public decimal? MatchScore { get; set; }

    public string Verdict { get; set; } = string.Empty;

    public string ResultJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Cv Cv { get; set; } = null!;
}
