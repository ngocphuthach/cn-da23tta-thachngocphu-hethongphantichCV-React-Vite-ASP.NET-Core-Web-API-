using System.Data;
using CvAdvisor.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed record CareerCatalogSnapshot(
    long CatalogVersion,
    IReadOnlyList<CareerSkillSnapshot> Skills,
    IReadOnlyList<CareerJobPositionSnapshot> JobPositions);

public sealed record CareerSkillSnapshot(string Code, string Name);

public sealed record CareerJobPositionSnapshot(
    string Code,
    string Name,
    IReadOnlyList<CareerJobSkillSnapshot> Skills);

public sealed record CareerJobSkillSnapshot(string Code, string Name, byte Importance, bool IsRequired);

public sealed class CareerCatalogSnapshotReader(CvCareerDbContext dbContext)
{
    public async Task<CareerCatalogSnapshot> ReadActiveAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.RepeatableRead, cancellationToken);
        var version = await dbContext.CatalogRevisions.AsNoTracking()
            .Where(item => item.RevisionId == 1).Select(item => item.Version)
            .SingleAsync(cancellationToken);
        var skills = await dbContext.Skills.AsNoTracking().Where(item => item.IsActive)
            .OrderBy(item => item.Code)
            .Select(item => new CareerSkillSnapshot(item.Code, item.Name))
            .ToListAsync(cancellationToken);
        var positionsRaw = await dbContext.JobPositions.AsNoTracking().Where(item => item.IsActive)
            .OrderBy(item => item.Code)
            .Select(position => new
            {
                position.Code,
                position.Name,
                Skills = position.JobPositionSkills.Where(link => link.Skill.IsActive)
                    .OrderBy(link => link.Skill.Code)
                    .Select(link => new CareerJobSkillSnapshot(
                        link.Skill.Code, link.Skill.Name, link.Importance, link.IsRequired))
                    .ToList(),
            }).ToListAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var positions = positionsRaw.Select(item => new CareerJobPositionSnapshot(
            item.Code, item.Name, item.Skills)).ToArray();
        return new(version, skills, positions);
    }
}
