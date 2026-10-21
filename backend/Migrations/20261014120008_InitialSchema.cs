using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CvAdvisor.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobPositions",
                columns: table => new
                {
                    JobPositionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPositions", x => x.JobPositionId);
                });

            migrationBuilder.CreateTable(
                name: "Skills",
                columns: table => new
                {
                    SkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skills", x => x.SkillId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "JobPositionSkills",
                columns: table => new
                {
                    JobPositionId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false),
                    Importance = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)3),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPositionSkills", x => new { x.JobPositionId, x.SkillId });
                    table.ForeignKey(
                        name: "FK_JobPositionSkills_JobPositions_JobPositionId",
                        column: x => x.JobPositionId,
                        principalTable: "JobPositions",
                        principalColumn: "JobPositionId");
                    table.ForeignKey(
                        name: "FK_JobPositionSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId");
                });

            migrationBuilder.CreateTable(
                name: "CVs",
                columns: table => new
                {
                    CvId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceType = table.Column<byte>(type: "tinyint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    FileExtension = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: true),
                    FileStorageKey = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    ContentText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CVs", x => x.CvId);
                    table.ForeignKey(
                        name: "FK_CVs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CVAnalyses",
                columns: table => new
                {
                    AnalysisId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CvId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    OverallScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    AiProvider = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    ModelName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ResultJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CVAnalyses", x => x.AnalysisId);
                    table.CheckConstraint("CK_CVAnalyses_OverallScore_Range", "[OverallScore] IS NULL OR ([OverallScore] >= 0 AND [OverallScore] <= 100)");
                    table.CheckConstraint("CK_CVAnalyses_ResultJson_IsJson", "[ResultJson] IS NULL OR ISJSON([ResultJson]) = 1");
                    table.ForeignKey(
                        name: "FK_CVAnalyses_CVs_CvId",
                        column: x => x.CvId,
                        principalTable: "CVs",
                        principalColumn: "CvId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "JobPositions",
                columns: new[] { "JobPositionId", "Category", "Code", "Description", "IsActive", "Name" },
                values: new object[,]
                {
                    { 1, "Software Development", "backend-developer", "Xây dựng API và xử lý nghiệp vụ phía máy chủ.", true, "Lập trình viên Backend" },
                    { 2, "Software Development", "frontend-developer", "Xây dựng giao diện web và tích hợp API.", true, "Lập trình viên Frontend" },
                    { 3, "Software Development", "fullstack-developer", "Phát triển cả giao diện và dịch vụ phía máy chủ.", true, "Lập trình viên Full-stack" },
                    { 4, "Software Development", "mobile-developer", "Phát triển ứng dụng di động đa nền tảng hoặc native.", true, "Lập trình viên Mobile" },
                    { 5, "Data", "data-analyst", "Phân tích dữ liệu và trình bày thông tin hỗ trợ quyết định.", true, "Chuyên viên Phân tích dữ liệu" },
                    { 6, "Data", "data-engineer", "Xây dựng pipeline và nền tảng lưu trữ dữ liệu.", true, "Kỹ sư Dữ liệu" },
                    { 7, "Quality Assurance", "qa-engineer", "Thiết kế và thực hiện kiểm thử phần mềm/API.", true, "Kỹ sư Kiểm thử phần mềm" },
                    { 8, "Infrastructure", "devops-engineer", "Tự động hóa build, triển khai và giám sát hệ thống.", true, "Kỹ sư DevOps" },
                    { 9, "Artificial Intelligence", "ai-ml-engineer", "Xây dựng và đánh giá giải pháp học máy.", true, "Kỹ sư AI/ML" }
                });

            migrationBuilder.InsertData(
                table: "Skills",
                columns: new[] { "SkillId", "Category", "Code", "IsActive", "Name" },
                values: new object[,]
                {
                    { 1, "Programming", "csharp", true, "C#" },
                    { 2, "Backend", "aspnet-core", true, "ASP.NET Core" },
                    { 3, "Backend", "rest-api", true, "REST API" },
                    { 4, "Database", "sql-server", true, "SQL Server" },
                    { 5, "Backend", "ef-core", true, "Entity Framework Core" },
                    { 6, "Tools", "git", true, "Git" },
                    { 7, "Programming", "javascript", true, "JavaScript" },
                    { 8, "Programming", "typescript", true, "TypeScript" },
                    { 9, "Frontend", "react", true, "React" },
                    { 10, "Frontend", "html", true, "HTML" },
                    { 11, "Frontend", "css", true, "CSS" },
                    { 12, "Mobile", "dotnet-maui", true, ".NET MAUI" },
                    { 13, "Mobile", "kotlin", true, "Kotlin" },
                    { 14, "Mobile", "swift", true, "Swift" },
                    { 15, "Database", "sql", true, "SQL" },
                    { 16, "Programming", "python", true, "Python" },
                    { 17, "Data", "excel", true, "Excel" },
                    { 18, "Data", "power-bi", true, "Power BI" },
                    { 19, "Data", "statistics", true, "Statistics" },
                    { 20, "Data", "etl", true, "ETL" },
                    { 21, "Data", "data-warehouse", true, "Data Warehouse" },
                    { 22, "DevOps", "docker", true, "Docker" },
                    { 23, "Testing", "test-design", true, "Test Design" },
                    { 24, "Testing", "manual-testing", true, "Manual Testing" },
                    { 25, "Testing", "api-testing", true, "API Testing" },
                    { 26, "Testing", "selenium", true, "Selenium" },
                    { 27, "DevOps", "linux", true, "Linux" },
                    { 28, "DevOps", "ci-cd", true, "CI/CD" },
                    { 29, "DevOps", "cloud", true, "Cloud" },
                    { 30, "DevOps", "monitoring", true, "Monitoring" },
                    { 31, "AI", "machine-learning", true, "Machine Learning" },
                    { 32, "AI", "pandas", true, "Pandas" },
                    { 33, "AI", "scikit-learn", true, "Scikit-learn" }
                });

            migrationBuilder.InsertData(
                table: "JobPositionSkills",
                columns: new[] { "JobPositionId", "SkillId", "Importance", "IsRequired" },
                values: new object[,]
                {
                    { 1, 1, (byte)3, true },
                    { 1, 2, (byte)3, true },
                    { 1, 3, (byte)3, true },
                    { 1, 4, (byte)3, true },
                    { 1, 5, (byte)3, true },
                    { 1, 6, (byte)3, true },
                    { 2, 3, (byte)3, true },
                    { 2, 6, (byte)3, true },
                    { 2, 7, (byte)3, true },
                    { 2, 8, (byte)3, true },
                    { 2, 9, (byte)3, true },
                    { 2, 10, (byte)3, true },
                    { 2, 11, (byte)3, true },
                    { 3, 1, (byte)3, true },
                    { 3, 2, (byte)3, true },
                    { 3, 4, (byte)3, true },
                    { 3, 5, (byte)3, true },
                    { 3, 6, (byte)3, true },
                    { 3, 8, (byte)3, true },
                    { 3, 9, (byte)3, true },
                    { 4, 3, (byte)3, true },
                    { 4, 6, (byte)3, true },
                    { 4, 12, (byte)3, true },
                    { 4, 13, (byte)3, true },
                    { 4, 14, (byte)3, true },
                    { 5, 15, (byte)3, true },
                    { 5, 16, (byte)3, true },
                    { 5, 17, (byte)3, true },
                    { 5, 18, (byte)3, true },
                    { 5, 19, (byte)3, true },
                    { 6, 6, (byte)3, true },
                    { 6, 15, (byte)3, true },
                    { 6, 16, (byte)3, true },
                    { 6, 20, (byte)3, true },
                    { 6, 21, (byte)3, true },
                    { 6, 22, (byte)3, true },
                    { 7, 6, (byte)3, true },
                    { 7, 15, (byte)3, true },
                    { 7, 23, (byte)3, true },
                    { 7, 24, (byte)3, true },
                    { 7, 25, (byte)3, true },
                    { 7, 26, (byte)3, true },
                    { 8, 6, (byte)3, true },
                    { 8, 22, (byte)3, true },
                    { 8, 27, (byte)3, true },
                    { 8, 28, (byte)3, true },
                    { 8, 29, (byte)3, true },
                    { 8, 30, (byte)3, true },
                    { 9, 15, (byte)3, true },
                    { 9, 16, (byte)3, true },
                    { 9, 19, (byte)3, true },
                    { 9, 31, (byte)3, true },
                    { 9, 32, (byte)3, true },
                    { 9, 33, (byte)3, true }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CVAnalyses_CvId",
                table: "CVAnalyses",
                column: "CvId");

            migrationBuilder.CreateIndex(
                name: "IX_CVs_UserId",
                table: "CVs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UX_JobPositions_Code",
                table: "JobPositions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPositionSkills_SkillId",
                table: "JobPositionSkills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "UX_Skills_Code",
                table: "Skills",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CVAnalyses");

            migrationBuilder.DropTable(
                name: "JobPositionSkills");

            migrationBuilder.DropTable(
                name: "CVs");

            migrationBuilder.DropTable(
                name: "JobPositions");

            migrationBuilder.DropTable(
                name: "Skills");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
