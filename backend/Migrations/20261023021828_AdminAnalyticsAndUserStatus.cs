using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAdvisor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AdminAnalyticsAndUserStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Users",
                type: "rowversion",
                rowVersion: true,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "FailureCode",
                table: "CVAnalyses",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_CVAnalyses_FailureCode_Allowed",
                table: "CVAnalyses",
                sql: "[FailureCode] IS NULL OR [FailureCode] IN ('AiUnavailable', 'AiTimeout', 'AiRejected', 'InvalidResult', 'FileInvalid', 'Unknown')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CVAnalyses_FailureCode_Allowed",
                table: "CVAnalyses");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FailureCode",
                table: "CVAnalyses");
        }
    }
}
