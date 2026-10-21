namespace CvAdvisor.Api.Models.Entities;

public sealed class JobPosition
{
    public int JobPositionId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<JobPositionSkill> JobPositionSkills { get; set; } = new List<JobPositionSkill>();
}
