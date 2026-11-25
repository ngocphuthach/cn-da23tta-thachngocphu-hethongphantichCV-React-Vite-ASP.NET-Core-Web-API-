namespace CvAdvisor.Api.Models.Entities;

public sealed class EmployerJobPosting
{
    public int EmployerJobPostingId { get; set; }
    public int EmployerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Requirements { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public DateTime DeadlineAt { get; set; }
    public bool IsActive { get; set; } = true;
    public byte[] RowVersion { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public Employer Employer { get; set; } = null!;
}
