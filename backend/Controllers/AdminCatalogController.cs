using System.Security.Claims;
using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("AdminByUser")]
[Route("api/admin/catalog")]
public sealed class AdminCatalogController(CatalogAdminService catalogService) : ControllerBase
{
    [HttpGet("job-positions")]
    public async Task<ActionResult<IReadOnlyList<JobPositionAdminDto>>> ListJobPositions(
        bool includeInactive = true, CancellationToken cancellationToken = default)
    {
        try { return Ok(await catalogService.GetJobPositionsAsync(includeInactive, cancellationToken)); }
        catch { return StatusCode(503, new { message = "Không thể tải danh mục nghề lúc này." }); }
    }

    [HttpPost("job-positions")]
    public async Task<ActionResult<CatalogMutationResult<JobPositionAdminDto>>> CreateJobPosition(
        CreateJobPositionRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try
        {
            var result = await catalogService.CreateJobPositionAsync(actorId, request, cancellationToken);
            return Created("/api/admin/catalog/job-positions", result);
        }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateException) { return Conflict(new { message = "Mã nghề đã tồn tại hoặc dữ liệu đang được tham chiếu." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi danh mục nghề." }); }
    }

    [HttpPut("job-positions/{id:int}")]
    public async Task<ActionResult<CatalogMutationResult<JobPositionAdminDto>>> UpdateJobPosition(
        int id, UpdateJobPositionRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try { return Ok(await catalogService.UpdateJobPositionAsync(actorId, id, request, cancellationToken)); }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Danh mục vừa được người khác cập nhật. Hãy tải lại trước khi sửa tiếp." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi danh mục nghề." }); }
    }

    [HttpGet("skills")]
    public async Task<ActionResult<IReadOnlyList<SkillAdminDto>>> ListSkills(
        bool includeInactive = true, CancellationToken cancellationToken = default)
    {
        try { return Ok(await catalogService.GetSkillsAsync(includeInactive, cancellationToken)); }
        catch { return StatusCode(503, new { message = "Không thể tải danh mục kỹ năng lúc này." }); }
    }

    [HttpPost("skills")]
    public async Task<ActionResult<CatalogMutationResult<SkillAdminDto>>> CreateSkill(
        CreateSkillRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try { return Created("/api/admin/catalog/skills", await catalogService.CreateSkillAsync(actorId, request, cancellationToken)); }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateException) { return Conflict(new { message = "Mã kỹ năng đã tồn tại hoặc dữ liệu đang được tham chiếu." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi danh mục kỹ năng." }); }
    }

    [HttpPut("skills/{id:int}")]
    public async Task<ActionResult<CatalogMutationResult<SkillAdminDto>>> UpdateSkill(
        int id, UpdateSkillRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try { return Ok(await catalogService.UpdateSkillAsync(actorId, id, request, cancellationToken)); }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Danh mục vừa được người khác cập nhật. Hãy tải lại trước khi sửa tiếp." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi danh mục kỹ năng." }); }
    }

    [HttpPut("job-positions/{positionId:int}/skills/{skillId:int}")]
    public async Task<ActionResult<CatalogMutationResult<JobPositionAdminDto>>> UpdatePositionSkill(
        int positionId, int skillId, UpdatePositionSkillRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try { return Ok(await catalogService.UpsertPositionSkillAsync(actorId, positionId, skillId, request, cancellationToken)); }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Liên kết vừa được người khác cập nhật. Hãy tải lại trước khi sửa tiếp." }); }
        catch (DbUpdateException) { return Conflict(new { message = "Liên kết nghề-kỹ năng đã tồn tại hoặc vừa thay đổi." }); }
        catch { return StatusCode(503, new { message = "Không thể cập nhật liên kết nghề-kỹ năng." }); }
    }

    [HttpDelete("job-positions/{positionId:int}/skills/{skillId:int}")]
    public async Task<ActionResult<CatalogMutationResult<JobPositionAdminDto>>> DeletePositionSkill(
        int positionId, int skillId, [FromQuery] string rowVersion, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        try { return Ok(await catalogService.DeletePositionSkillAsync(actorId, positionId, skillId, rowVersion, cancellationToken)); }
        catch (CatalogAdminException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Liên kết vừa được người khác cập nhật. Hãy tải lại trước khi sửa tiếp." }); }
        catch { return StatusCode(503, new { message = "Không thể gỡ liên kết nghề-kỹ năng." }); }
    }

    [HttpGet("audit")]
    public async Task<ActionResult<PagedCatalogAuditResponse>> GetAudit(
        int page = 1, int pageSize = 20, CancellationToken cancellationToken = default)
    {
        try { return Ok(await catalogService.GetAuditAsync(page, pageSize, cancellationToken)); }
        catch (AdminRequestException exception) { return BadRequest(new { message = exception.Message }); }
        catch { return StatusCode(503, new { message = "Không thể tải nhật ký thay đổi lúc này." }); }
    }

    private bool TryGetActorId(out Guid actorId) =>
        Guid.TryParse(User.FindFirstValue("sub"), out actorId);
}
