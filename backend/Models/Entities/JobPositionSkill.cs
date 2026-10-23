namespace CvAdvisor.Api.Models.Entities;

public sealed class JobPositionSkill
{
    public int JobPositionId { get; set; }

    public int SkillId { get; set; }

    public byte Importance { get; set; }

    public bool IsRequired { get; set; } = true;

    public byte[] RowVersion { get; set; } = null!;

    public JobPosition JobPosition { get; set; } = null!;

    public Skill Skill { get; set; } = null!;
}
