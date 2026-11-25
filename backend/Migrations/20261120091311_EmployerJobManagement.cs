using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAdvisor.Api.Migrations
{
    /// <inheritdoc />
    public partial class EmployerJobManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Employers",
                columns: table => new
                {
                    EmployerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CareersUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employers", x => x.EmployerId);
                });

            migrationBuilder.CreateTable(
                name: "EmployerJobPostings",
                columns: table => new
                {
                    EmployerJobPostingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Requirements = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DeadlineAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerJobPostings", x => x.EmployerJobPostingId);
                    table.CheckConstraint("CK_EmployerJobPostings_Requirements_Size", "DATALENGTH([Requirements]) <= 40000");
                    table.ForeignKey(
                        name: "FK_EmployerJobPostings_Employers_EmployerId",
                        column: x => x.EmployerId,
                        principalTable: "Employers",
                        principalColumn: "EmployerId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployerJobPostings_Employer_Active_Deadline",
                table: "EmployerJobPostings",
                columns: new[] { "EmployerId", "IsActive", "DeadlineAt" });

            migrationBuilder.CreateIndex(
                name: "UX_Employers_Name",
                table: "Employers",
                column: "Name",
                unique: true);

            migrationBuilder.InsertData(
                table: "Employers",
                columns: new[] { "EmployerId", "Name", "WebsiteUrl", "CareersUrl", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    {
                        1, "Công Ty Phần Mềm SystemEXE Việt Nam", "https://system-exe.com.vn",
                        "https://system-exe.com.vn/recruitment/", true,
                        new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc),
                    },
                    {
                        2, "FPT Software", "https://fptsoftware.com",
                        "https://career.fpt-software.com/jobs-search/", true,
                        new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc),
                    },
                    {
                        3, "Viettel", "https://viettel.com.vn",
                        "https://tuyendung.viettel.vn/recruitment-information/search", true,
                        new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc),
                    },
                });

            migrationBuilder.InsertData(
                table: "EmployerJobPostings",
                columns: new[] { "EmployerJobPostingId", "EmployerId", "Title", "Location", "Requirements", "SourceUrl", "DeadlineAt", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    {
                        1, 1, "Java Developer", "Cần Thơ",
                        "Tối thiểu 3 năm lập trình Java và Spring Boot; ưu tiên VueJS, Angular hoặc React; biết Git; khả năng làm việc nhóm; tiếng Nhật là lợi thế.",
                        "https://sanvieclamcantho.vn/viec-lam/java-developer-15679.html",
                        new DateTime(2026, 11, 24, 23, 59, 59, DateTimeKind.Utc), true,
                        new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc),
                    },
                    {
                        2, 1, ".NET Developer", "Cần Thơ",
                        "Yêu cầu kinh nghiệm với .NET Framework hoặc .NET 8, C#, ASP.NET Core, MVC, Web API, ADO.NET và EF Core; cơ sở dữ liệu Oracle, SQL Server hoặc PostgreSQL; kiến thức web frontend và hạ tầng là lợi thế.",
                        "https://sanvieclamcantho.vn/viec-lam/net-developer-15678.html",
                        new DateTime(2026, 11, 24, 23, 59, 59, DateTimeKind.Utc), true,
                        new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc),
                    },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployerJobPostings");

            migrationBuilder.DropTable(
                name: "Employers");
        }
    }
}
