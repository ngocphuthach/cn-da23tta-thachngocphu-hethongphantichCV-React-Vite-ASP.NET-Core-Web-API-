using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("AdminByUser")]
[Route("api/admin/cvs")]
public sealed class AdminCvsController(AdminCvService adminCvService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedAdminCvsDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sourceType = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await adminCvService.GetCvsAsync(page, pageSize, sourceType, cancellationToken));
        }
        catch (AdminRequestException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            return StatusCode(503, new { message = "Không thể tải danh sách CV lúc này." });
        }
    }
}
