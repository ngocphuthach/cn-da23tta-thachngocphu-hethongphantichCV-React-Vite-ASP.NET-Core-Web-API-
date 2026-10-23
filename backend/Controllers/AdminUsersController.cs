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
[Route("api/admin/users")]
public sealed class AdminUsersController(AdminManagementService adminService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedAdminUsersDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? email = null,
        CancellationToken cancellationToken = default)
    {
        try { return Ok(await adminService.GetUsersAsync(page, pageSize, email, cancellationToken)); }
        catch (AdminRequestException exception) { return BadRequest(new { message = exception.Message }); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch { return StatusCode(503, new { message = "Không thể tải danh sách người dùng lúc này." }); }
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<AdminUserDto>> UpdateStatus(
        Guid id, UpdateAdminUserStatusRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var actorId)) return Unauthorized();
        try { return Ok(await adminService.UpdateUserStatusAsync(actorId, id, request, cancellationToken)); }
        catch (AdminRequestException exception) { return StatusCode(exception.StatusCode, new { message = exception.Message }); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Tài khoản vừa được cập nhật. Hãy tải lại danh sách." }); }
        catch (DbUpdateException) { return Conflict(new { message = "Trạng thái Admin vừa thay đổi. Hãy tải lại rồi thử lại." }); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch { return StatusCode(503, new { message = "Không thể cập nhật trạng thái tài khoản lúc này." }); }
    }
}
