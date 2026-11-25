using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Data;

public sealed class CvCareerDbContext(DbContextOptions<CvCareerDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Cv> CVs => Set<Cv>();

    public DbSet<Skill> Skills => Set<Skill>();

    public DbSet<JobPosition> JobPositions => Set<JobPosition>();

    public DbSet<JobPositionSkill> JobPositionSkills => Set<JobPositionSkill>();

    public DbSet<CvAnalysis> CVAnalyses => Set<CvAnalysis>();

    public DbSet<CatalogRevision> CatalogRevisions => Set<CatalogRevision>();

    public DbSet<AdminCatalogAuditLog> AdminCatalogAuditLogs => Set<AdminCatalogAuditLog>();

    public DbSet<Employer> Employers => Set<Employer>();

    public DbSet<EmployerJobPosting> EmployerJobPostings => Set<EmployerJobPosting>();

    public DbSet<CvJobMatch> CvJobMatches => Set<CvJobMatch>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUsers(modelBuilder);
        ConfigureCVs(modelBuilder);
        ConfigureSkills(modelBuilder);
        ConfigureJobPositions(modelBuilder);
        ConfigureJobPositionSkills(modelBuilder);
        ConfigureCVAnalyses(modelBuilder);
        ConfigureCatalogAdministration(modelBuilder);
        ConfigureEmployerJobs(modelBuilder);
        ConfigureCvJobMatches(modelBuilder);

        modelBuilder.Entity<Skill>().HasData(CatalogSeedData.Skills);
        modelBuilder.Entity<JobPosition>().HasData(CatalogSeedData.JobPositions);
        modelBuilder.Entity<JobPositionSkill>().HasData(CatalogSeedData.JobPositionSkills);
        modelBuilder.Entity<CatalogRevision>().HasData(new CatalogRevision { RevisionId = 1, Version = 1 });
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<User>();
        entity.ToTable("Users", table => table.HasCheckConstraint(
            "CK_Users_Role_Allowed", "[Role] IN ('User', 'Admin')"));
        entity.HasKey(user => user.UserId);

        entity.Property(user => user.Email).HasMaxLength(256).IsRequired();
        entity.HasIndex(user => user.Email).IsUnique().HasDatabaseName("UX_Users_Email");
        entity.Property(user => user.FullName).HasMaxLength(150).IsRequired();
        entity.Property(user => user.PasswordHash).HasMaxLength(512).IsRequired();
        entity.Property(user => user.Role).HasMaxLength(20).IsRequired().HasDefaultValue(UserRoles.User);
        entity.Property(user => user.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        entity.Property(user => user.IsActive).HasDefaultValue(true);
        entity.Property(user => user.RowVersion).IsRowVersion();

        entity.HasMany(user => user.Cvs)
            .WithOne(cv => cv.User)
            .HasForeignKey(cv => cv.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureCVs(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Cv>();
        entity.ToTable("CVs");
        entity.HasKey(cv => cv.CvId);

        entity.Property(cv => cv.SourceType).HasConversion<byte>().HasColumnType("tinyint");
        entity.Property(cv => cv.Title).HasMaxLength(150).IsRequired();
        entity.Property(cv => cv.OriginalFileName).HasMaxLength(255);
        entity.Property(cv => cv.FileExtension).HasMaxLength(10).IsUnicode(false);
        entity.Property(cv => cv.FileStorageKey).HasMaxLength(512);
        entity.Property(cv => cv.ContentText).HasColumnType("nvarchar(max)");
        entity.Property(cv => cv.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        entity.HasIndex(cv => cv.UserId).HasDatabaseName("IX_CVs_UserId");
    }

    private static void ConfigureSkills(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Skill>();
        entity.ToTable("Skills");
        entity.HasKey(skill => skill.SkillId);

        entity.Property(skill => skill.SkillId).UseIdentityColumn();
        entity.Property(skill => skill.Code).HasMaxLength(60).IsUnicode(false).IsRequired();
        entity.HasIndex(skill => skill.Code).IsUnique().HasDatabaseName("UX_Skills_Code");
        entity.Property(skill => skill.Name).HasMaxLength(100).IsRequired();
        entity.Property(skill => skill.Category).HasMaxLength(60).IsRequired();
        entity.Property(skill => skill.IsActive).HasDefaultValue(true);
        entity.Property(skill => skill.RowVersion).IsRowVersion();
    }

    private static void ConfigureJobPositions(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<JobPosition>();
        entity.ToTable("JobPositions");
        entity.HasKey(position => position.JobPositionId);

        entity.Property(position => position.JobPositionId).UseIdentityColumn();
        entity.Property(position => position.Code).HasMaxLength(50).IsUnicode(false).IsRequired();
        entity.HasIndex(position => position.Code).IsUnique().HasDatabaseName("UX_JobPositions_Code");
        entity.Property(position => position.Name).HasMaxLength(120).IsRequired();
        entity.Property(position => position.Category).HasMaxLength(60).IsRequired();
        entity.Property(position => position.Description).HasMaxLength(1000);
        entity.Property(position => position.IsActive).HasDefaultValue(true);
        entity.Property(position => position.RowVersion).IsRowVersion();
    }

    private static void ConfigureJobPositionSkills(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<JobPositionSkill>();
        entity.ToTable("JobPositionSkills");
        entity.HasKey(link => new { link.JobPositionId, link.SkillId });

        entity.Property(link => link.Importance).HasColumnType("tinyint").HasDefaultValue((byte)3);
        entity.Property(link => link.IsRequired).HasDefaultValue(true);
        entity.Property(link => link.RowVersion).IsRowVersion();

        entity.HasOne(link => link.JobPosition)
            .WithMany(position => position.JobPositionSkills)
            .HasForeignKey(link => link.JobPositionId)
            .OnDelete(DeleteBehavior.NoAction);

        entity.HasOne(link => link.Skill)
            .WithMany()
            .HasForeignKey(link => link.SkillId)
            .OnDelete(DeleteBehavior.NoAction);
    }

    private static void ConfigureCatalogAdministration(ModelBuilder modelBuilder)
    {
        var revision = modelBuilder.Entity<CatalogRevision>();
        revision.ToTable("CatalogRevisions");
        revision.HasKey(item => item.RevisionId);
        revision.Property(item => item.RevisionId).ValueGeneratedNever();
        revision.Property(item => item.Version).IsConcurrencyToken();

        var audit = modelBuilder.Entity<AdminCatalogAuditLog>();
        audit.ToTable("AdminCatalogAuditLogs", table => table.HasCheckConstraint(
            "CK_AdminCatalogAuditLogs_JsonSize",
            "([BeforeJson] IS NULL OR DATALENGTH([BeforeJson]) <= 16384) AND ([AfterJson] IS NULL OR DATALENGTH([AfterJson]) <= 16384)"));
        audit.HasKey(item => item.AuditId);
        audit.Property(item => item.AuditId).UseIdentityColumn();
        audit.Property(item => item.OccurredAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        audit.Property(item => item.Action).HasMaxLength(32).IsRequired();
        audit.Property(item => item.ObjectType).HasMaxLength(32).IsRequired();
        audit.Property(item => item.ObjectId).HasMaxLength(160).IsRequired();
        audit.Property(item => item.BeforeJson).HasColumnType("nvarchar(max)");
        audit.Property(item => item.AfterJson).HasColumnType("nvarchar(max)");
        audit.HasIndex(item => item.OccurredAt).HasDatabaseName("IX_AdminCatalogAuditLogs_OccurredAt");
        audit.HasIndex(item => item.ActorUserId).HasDatabaseName("IX_AdminCatalogAuditLogs_ActorUserId");
        audit.HasOne(item => item.Actor).WithMany().HasForeignKey(item => item.ActorUserId)
            .OnDelete(DeleteBehavior.NoAction);
    }

    private static void ConfigureEmployerJobs(ModelBuilder modelBuilder)
    {
        var employer = modelBuilder.Entity<Employer>();
        employer.ToTable("Employers");
        employer.HasKey(item => item.EmployerId);
        employer.Property(item => item.EmployerId).UseIdentityColumn();
        employer.Property(item => item.Name).HasMaxLength(200).IsRequired();
        employer.HasIndex(item => item.Name).IsUnique().HasDatabaseName("UX_Employers_Name");
        employer.Property(item => item.WebsiteUrl).HasMaxLength(500);
        employer.Property(item => item.CareersUrl).HasMaxLength(500);
        employer.Property(item => item.IsActive).HasDefaultValue(true);
        employer.Property(item => item.RowVersion).IsRowVersion();
        employer.Property(item => item.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");

        var posting = modelBuilder.Entity<EmployerJobPosting>();
        posting.ToTable("EmployerJobPostings", table => table.HasCheckConstraint(
            "CK_EmployerJobPostings_Requirements_Size", "DATALENGTH([Requirements]) <= 40000"));
        posting.HasKey(item => item.EmployerJobPostingId);
        posting.Property(item => item.EmployerJobPostingId).UseIdentityColumn();
        posting.Property(item => item.Title).HasMaxLength(200).IsRequired();
        posting.Property(item => item.Location).HasMaxLength(120).IsRequired();
        posting.Property(item => item.Requirements).HasColumnType("nvarchar(max)").IsRequired();
        posting.Property(item => item.SourceUrl).HasMaxLength(1000).IsRequired();
        posting.Property(item => item.DeadlineAt).HasColumnType("datetime2");
        posting.Property(item => item.IsActive).HasDefaultValue(true);
        posting.Property(item => item.RowVersion).IsRowVersion();
        posting.Property(item => item.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        posting.HasIndex(item => new { item.EmployerId, item.IsActive, item.DeadlineAt })
            .HasDatabaseName("IX_EmployerJobPostings_Employer_Active_Deadline");
        posting.HasOne(item => item.Employer).WithMany(item => item.JobPostings)
            .HasForeignKey(item => item.EmployerId).OnDelete(DeleteBehavior.NoAction);
    }

    private static void ConfigureCVAnalyses(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CvAnalysis>();
        entity.ToTable("CVAnalyses", table =>
        {
            table.HasCheckConstraint(
                "CK_CVAnalyses_OverallScore_Range",
                "[OverallScore] IS NULL OR ([OverallScore] >= 0 AND [OverallScore] <= 100)");
            table.HasCheckConstraint(
                "CK_CVAnalyses_ResultJson_IsJson",
                "[ResultJson] IS NULL OR ISJSON([ResultJson]) = 1");
            table.HasCheckConstraint(
                "CK_CVAnalyses_FailureCode_Allowed",
                "[FailureCode] IS NULL OR [FailureCode] IN ('AiUnavailable', 'AiTimeout', 'AiRejected', 'InvalidResult', 'FileInvalid', 'Unknown')");
        });
        entity.HasKey(analysis => analysis.AnalysisId);

        entity.Property(analysis => analysis.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(CvAnalysisStatus.Pending)
            .IsRequired();
        entity.Property(analysis => analysis.OverallScore).HasColumnType("decimal(5,2)");
        entity.Property(analysis => analysis.AiProvider).HasMaxLength(20).IsUnicode(false);
        entity.Property(analysis => analysis.ModelName).HasMaxLength(100);
        entity.Property(analysis => analysis.ResultJson).HasColumnType("nvarchar(max)");
        entity.Property(analysis => analysis.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        entity.Property(analysis => analysis.CompletedAt).HasColumnType("datetime2");
        entity.Property(analysis => analysis.FailureCode)
            .HasConversion<string>()
            .HasMaxLength(32);
        entity.HasIndex(analysis => analysis.CvId).HasDatabaseName("IX_CVAnalyses_CvId");

        entity.HasOne(analysis => analysis.Cv)
            .WithMany(cv => cv.Analyses)
            .HasForeignKey(analysis => analysis.CvId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureCvJobMatches(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CvJobMatch>();
        entity.ToTable("CvJobMatches", table =>
        {
            table.HasCheckConstraint(
                "CK_CvJobMatches_Score_Range",
                "[MatchScore] IS NULL OR ([MatchScore] >= 0 AND [MatchScore] <= 100)");
            table.HasCheckConstraint(
                "CK_CvJobMatches_ResultJson_IsJson",
                "ISJSON([ResultJson]) = 1");
        });
        entity.HasKey(match => match.MatchId);

        entity.Property(match => match.CompanyName).HasMaxLength(200).IsRequired();
        entity.Property(match => match.PositionTitle).HasMaxLength(200).IsRequired();
        entity.Property(match => match.MatchScore).HasColumnType("decimal(5,2)");
        entity.Property(match => match.Verdict).HasMaxLength(150).IsRequired();
        entity.Property(match => match.ResultJson).HasColumnType("nvarchar(max)").IsRequired();
        entity.Property(match => match.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        entity.HasIndex(match => new { match.CvId, match.CreatedAt }).HasDatabaseName("IX_CvJobMatches_CvId_CreatedAt");

        entity.HasOne(match => match.Cv)
            .WithMany()
            .HasForeignKey(match => match.CvId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
