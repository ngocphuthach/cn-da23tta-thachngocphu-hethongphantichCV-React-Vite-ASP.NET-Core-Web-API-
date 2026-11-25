using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAdvisor.Api.Migrations
{
    /// <inheritdoc />
    public partial class CvJobMatchHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CvJobMatches",
                columns: table => new
                {
                    MatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CvId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployerJobPostingId = table.Column<int>(type: "int", nullable: true),
                    CompanyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PositionTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MatchScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    Verdict = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ResultJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CvJobMatches", x => x.MatchId);
                    table.CheckConstraint("CK_CvJobMatches_ResultJson_IsJson", "ISJSON([ResultJson]) = 1");
                    table.CheckConstraint("CK_CvJobMatches_Score_Range", "[MatchScore] IS NULL OR ([MatchScore] >= 0 AND [MatchScore] <= 100)");
                    table.ForeignKey(
                        name: "FK_CvJobMatches_CVs_CvId",
                        column: x => x.CvId,
                        principalTable: "CVs",
                        principalColumn: "CvId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CvJobMatches_CvId_CreatedAt",
                table: "CvJobMatches",
                columns: new[] { "CvId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CvJobMatches");
        }
    }
}
