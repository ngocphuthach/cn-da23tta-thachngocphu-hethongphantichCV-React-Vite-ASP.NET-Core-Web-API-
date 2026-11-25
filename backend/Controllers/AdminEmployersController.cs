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
[Route("api/admin/employers")]
public sealed class AdminEmployersController(EmployerJobService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Employers(CancellationToken ct)
    {
        try { return Ok(await service.ListEmployersAsync(ct)); }
        catch { return StatusCode(503, new { message = "Không thể tải danh sách nhà tuyển dụng." }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateEmployer(CreateEmployerRequest request, CancellationToken ct)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        try { return Ok(await service.CreateEmployerAsync(actorId, request, ct)); }
        catch (EmployerAdminException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Dữ liệu vừa được cập nhật. Tải lại rồi thử tiếp." }); }
        catch (DbUpdateException) { return Conflict(new { message = "Tên nhà tuyển dụng đã tồn tại." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu nhà tuyển dụng." }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateEmployer(int id, UpdateEmployerRequest request, CancellationToken ct)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        try { return Ok(await service.UpdateEmployerAsync(actorId, id, request, ct)); }
        catch (EmployerAdminException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Nhà tuyển dụng vừa được người khác sửa. Tải lại rồi thử tiếp." }); }
        catch (DbUpdateException) { return Conflict(new { message = "Tên nhà tuyển dụng đã tồn tại." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi nhà tuyển dụng." }); }
    }

    [HttpGet("postings")]
    public async Task<IActionResult> Postings(CancellationToken ct)
    {
        try { return Ok(await service.ListPostingsAsync(ct)); }
        catch { return StatusCode(503, new { message = "Không thể tải danh sách tin tuyển dụng." }); }
    }

    [HttpPost("postings")]
    public async Task<IActionResult> CreatePosting(CreateEmployerJobRequest request, CancellationToken ct)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        try { return Ok(await service.CreatePostingAsync(actorId, request, ct)); }
        catch (EmployerAdminException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Dữ liệu vừa được cập nhật. Tải lại rồi thử tiếp." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu tin tuyển dụng." }); }
    }

    [HttpPut("postings/{id:int}")]
    public async Task<IActionResult> UpdatePosting(int id, UpdateEmployerJobRequest request, CancellationToken ct)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        try { return Ok(await service.UpdatePostingAsync(actorId, id, request, ct)); }
        catch (EmployerAdminException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Tin tuyển dụng vừa được người khác sửa. Tải lại rồi thử tiếp." }); }
        catch { return StatusCode(503, new { message = "Không thể lưu thay đổi tin tuyển dụng." }); }
    }

    private bool TryGetActor(out Guid actorId) => Guid.TryParse(User.FindFirstValue("sub"), out actorId);
}
