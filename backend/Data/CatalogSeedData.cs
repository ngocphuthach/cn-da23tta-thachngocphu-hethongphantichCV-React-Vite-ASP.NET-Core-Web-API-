using CvAdvisor.Api.Models.Entities;

namespace CvAdvisor.Api.Data;

internal static class CatalogSeedData
{
    internal static readonly Skill[] Skills =
    [
        new() { SkillId = 1, Code = "csharp", Name = "C#", Category = "Programming", IsActive = true },
        new() { SkillId = 2, Code = "aspnet-core", Name = "ASP.NET Core", Category = "Backend", IsActive = true },
        new() { SkillId = 3, Code = "rest-api", Name = "REST API", Category = "Backend", IsActive = true },
        new() { SkillId = 4, Code = "sql-server", Name = "SQL Server", Category = "Database", IsActive = true },
        new() { SkillId = 5, Code = "ef-core", Name = "Entity Framework Core", Category = "Backend", IsActive = true },
        new() { SkillId = 6, Code = "git", Name = "Git", Category = "Tools", IsActive = true },
        new() { SkillId = 7, Code = "javascript", Name = "JavaScript", Category = "Programming", IsActive = true },
        new() { SkillId = 8, Code = "typescript", Name = "TypeScript", Category = "Programming", IsActive = true },
        new() { SkillId = 9, Code = "react", Name = "React", Category = "Frontend", IsActive = true },
        new() { SkillId = 10, Code = "html", Name = "HTML", Category = "Frontend", IsActive = true },
        new() { SkillId = 11, Code = "css", Name = "CSS", Category = "Frontend", IsActive = true },
        new() { SkillId = 12, Code = "dotnet-maui", Name = ".NET MAUI", Category = "Mobile", IsActive = true },
        new() { SkillId = 13, Code = "kotlin", Name = "Kotlin", Category = "Mobile", IsActive = true },
        new() { SkillId = 14, Code = "swift", Name = "Swift", Category = "Mobile", IsActive = true },
        new() { SkillId = 15, Code = "sql", Name = "SQL", Category = "Database", IsActive = true },
        new() { SkillId = 16, Code = "python", Name = "Python", Category = "Programming", IsActive = true },
        new() { SkillId = 17, Code = "excel", Name = "Excel", Category = "Data", IsActive = true },
        new() { SkillId = 18, Code = "power-bi", Name = "Power BI", Category = "Data", IsActive = true },
        new() { SkillId = 19, Code = "statistics", Name = "Statistics", Category = "Data", IsActive = true },
        new() { SkillId = 20, Code = "etl", Name = "ETL", Category = "Data", IsActive = true },
        new() { SkillId = 21, Code = "data-warehouse", Name = "Data Warehouse", Category = "Data", IsActive = true },
        new() { SkillId = 22, Code = "docker", Name = "Docker", Category = "DevOps", IsActive = true },
        new() { SkillId = 23, Code = "test-design", Name = "Test Design", Category = "Testing", IsActive = true },
        new() { SkillId = 24, Code = "manual-testing", Name = "Manual Testing", Category = "Testing", IsActive = true },
        new() { SkillId = 25, Code = "api-testing", Name = "API Testing", Category = "Testing", IsActive = true },
        new() { SkillId = 26, Code = "selenium", Name = "Selenium", Category = "Testing", IsActive = true },
        new() { SkillId = 27, Code = "linux", Name = "Linux", Category = "DevOps", IsActive = true },
        new() { SkillId = 28, Code = "ci-cd", Name = "CI/CD", Category = "DevOps", IsActive = true },
        new() { SkillId = 29, Code = "cloud", Name = "Cloud", Category = "DevOps", IsActive = true },
        new() { SkillId = 30, Code = "monitoring", Name = "Monitoring", Category = "DevOps", IsActive = true },
        new() { SkillId = 31, Code = "machine-learning", Name = "Machine Learning", Category = "AI", IsActive = true },
        new() { SkillId = 32, Code = "pandas", Name = "Pandas", Category = "AI", IsActive = true },
        new() { SkillId = 33, Code = "scikit-learn", Name = "Scikit-learn", Category = "AI", IsActive = true }
    ];

    internal static readonly JobPosition[] JobPositions =
    [
        new() { JobPositionId = 1, Code = "backend-developer", Name = "Lập trình viên Backend", Category = "Software Development", Description = "Xây dựng API và xử lý nghiệp vụ phía máy chủ.", IsActive = true },
        new() { JobPositionId = 2, Code = "frontend-developer", Name = "Lập trình viên Frontend", Category = "Software Development", Description = "Xây dựng giao diện web và tích hợp API.", IsActive = true },
        new() { JobPositionId = 3, Code = "fullstack-developer", Name = "Lập trình viên Full-stack", Category = "Software Development", Description = "Phát triển cả giao diện và dịch vụ phía máy chủ.", IsActive = true },
        new() { JobPositionId = 4, Code = "mobile-developer", Name = "Lập trình viên Mobile", Category = "Software Development", Description = "Phát triển ứng dụng di động đa nền tảng hoặc native.", IsActive = true },
        new() { JobPositionId = 5, Code = "data-analyst", Name = "Chuyên viên Phân tích dữ liệu", Category = "Data", Description = "Phân tích dữ liệu và trình bày thông tin hỗ trợ quyết định.", IsActive = true },
        new() { JobPositionId = 6, Code = "data-engineer", Name = "Kỹ sư Dữ liệu", Category = "Data", Description = "Xây dựng pipeline và nền tảng lưu trữ dữ liệu.", IsActive = true },
        new() { JobPositionId = 7, Code = "qa-engineer", Name = "Kỹ sư Kiểm thử phần mềm", Category = "Quality Assurance", Description = "Thiết kế và thực hiện kiểm thử phần mềm/API.", IsActive = true },
        new() { JobPositionId = 8, Code = "devops-engineer", Name = "Kỹ sư DevOps", Category = "Infrastructure", Description = "Tự động hóa build, triển khai và giám sát hệ thống.", IsActive = true },
        new() { JobPositionId = 9, Code = "ai-ml-engineer", Name = "Kỹ sư AI/ML", Category = "Artificial Intelligence", Description = "Xây dựng và đánh giá giải pháp học máy.", IsActive = true }
    ];

    internal static readonly JobPositionSkill[] JobPositionSkills =
    [
        .. Link(1, 1, 2, 3, 4, 5, 6),
        .. Link(2, 7, 8, 9, 10, 11, 3, 6),
        .. Link(3, 1, 2, 4, 5, 8, 9, 6),
        .. Link(4, 12, 13, 14, 3, 6),
        .. Link(5, 15, 16, 17, 18, 19),
        .. Link(6, 16, 15, 20, 21, 22, 6),
        .. Link(7, 23, 24, 25, 26, 15, 6),
        .. Link(8, 27, 22, 28, 29, 30, 6),
        .. Link(9, 16, 31, 19, 32, 33, 15)
    ];

    private static JobPositionSkill[] Link(int jobPositionId, params int[] skillIds)
    {
        return skillIds.Select(skillId => new JobPositionSkill
        {
            JobPositionId = jobPositionId,
            SkillId = skillId,
            Importance = 3,
            IsRequired = true
        }).ToArray();
    }
}
