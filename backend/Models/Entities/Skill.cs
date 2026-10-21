namespace CvAdvisor.Api.Models.Entities;

public sealed class Skill
{
    public int SkillId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
