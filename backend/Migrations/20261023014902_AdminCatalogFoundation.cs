using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvAdvisor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AdminCatalogFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "User");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Skills",
                type: "rowversion",
                rowVersion: true,
                nullable: false);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "JobPositionSkills",
                type: "rowversion",
                rowVersion: true,
                nullable: false);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "JobPositions",
                type: "rowversion",
                rowVersion: true,
                nullable: false);

            migrationBuilder.CreateTable(
                name: "AdminCatalogAuditLogs",
                columns: table => new
                {
                    AuditId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    Action = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ObjectType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ObjectId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    BeforeJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AfterJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminCatalogAuditLogs", x => x.AuditId);
                    table.CheckConstraint("CK_AdminCatalogAuditLogs_JsonSize", "([BeforeJson] IS NULL OR DATALENGTH([BeforeJson]) <= 16384) AND ([AfterJson] IS NULL OR DATALENGTH([AfterJson]) <= 16384)");
                    table.ForeignKey(
                        name: "FK_AdminCatalogAuditLogs_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "CatalogRevisions",
                columns: table => new
                {
                    RevisionId = table.Column<short>(type: "smallint", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogRevisions", x => x.RevisionId);
                });

            migrationBuilder.InsertData(
                table: "CatalogRevisions",
                columns: new[] { "RevisionId", "Version" },
                values: new object[] { (short)1, 1L });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_Role_Allowed",
                table: "Users",
                sql: "[Role] IN ('User', 'Admin')");

            migrationBuilder.CreateIndex(
                name: "IX_AdminCatalogAuditLogs_ActorUserId",
                table: "AdminCatalogAuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminCatalogAuditLogs_OccurredAt",
                table: "AdminCatalogAuditLogs",
                column: "OccurredAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminCatalogAuditLogs");

            migrationBuilder.DropTable(
                name: "CatalogRevisions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_Role_Allowed",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Skills");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "JobPositionSkills");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "JobPositions");
        }
    }
}
