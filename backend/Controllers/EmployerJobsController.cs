using CvAdvisor.Api.Models.Admin;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/employer-jobs")]
public sealed class EmployerJobsController(EmployerJobService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EmployerJobOptionDto>>> List(CancellationToken ct)
    {
        try { return Ok(await service.ListAvailableAsync(ct)); }
        catch { return StatusCode(503, new { message = "Không thể tải tin tuyển dụng lúc này." }); }
    }
}
