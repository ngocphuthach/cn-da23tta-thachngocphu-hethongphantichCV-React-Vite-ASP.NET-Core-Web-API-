namespace CvAdvisor.Api.Models.Entities;

public sealed class Employer
{
    public int EmployerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? WebsiteUrl { get; set; }
    public string? CareersUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public byte[] RowVersion { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public ICollection<EmployerJobPosting> JobPostings { get; set; } = new List<EmployerJobPosting>();
}
