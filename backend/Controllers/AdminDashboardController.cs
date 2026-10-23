using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("AdminByUser")]
[Route("api/admin/stats")]
public sealed class AdminDashboardController(AdminDashboardService dashboardService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminDashboardStatsDto>> Get(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await dashboardService.GetStatsAsync(cancellationToken));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            return StatusCode(503, new { message = "Không thể tải thống kê quản trị lúc này." });
        }
    }
}
