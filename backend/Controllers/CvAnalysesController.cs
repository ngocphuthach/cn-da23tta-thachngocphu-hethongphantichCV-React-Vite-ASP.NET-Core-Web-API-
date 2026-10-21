using System.Security.Claims;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Cvs;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/cv-analyses")]
public sealed class CvAnalysesController(
    CvCareerDbContext dbContext,
    CvAnalysisService analysisService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedCvAnalysisResponse>> ListMine(
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        page = Math.Clamp(page, 1, 1_000_000);
        pageSize = Math.Clamp(pageSize, 1, 100);
        await analysisService.MarkExpiredPendingForUserAsync(userId, null, cancellationToken);

        var query = dbContext.CVAnalyses.AsNoTracking()
            .Where(analysis => analysis.Cv.UserId == userId);
        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(analysis => analysis.CreatedAt)
            .ThenBy(analysis => analysis.AnalysisId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(analysis => new
            {
                analysis.AnalysisId,
                analysis.CvId,
                analysis.CreatedAt,
                analysis.Status,
                analysis.OverallScore,
                analysis.ResultJson,
            })
            .ToListAsync(cancellationToken);
        var items = rows.Select(row => CvAnalysisDtoMapper.ToListDto(
            row.AnalysisId,
            row.CvId,
            row.CreatedAt,
            row.Status,
            row.OverallScore,
            row.ResultJson)).ToArray();

        return Ok(new PagedCvAnalysisResponse(page, pageSize, totalCount, items));
    }

    [HttpGet("{analysisId:guid}")]
    public async Task<ActionResult<CvAnalysisDetailDto>> GetDetail(
        Guid analysisId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var cvId = await dbContext.CVAnalyses.AsNoTracking()
            .Where(analysis => analysis.AnalysisId == analysisId && analysis.Cv.UserId == userId)
            .Select(analysis => (Guid?)analysis.CvId)
            .SingleOrDefaultAsync(cancellationToken);
        if (cvId is null)
        {
            return NotFound();
        }

        await analysisService.MarkExpiredPendingForUserAsync(userId, cvId, cancellationToken);
        var analysis = await dbContext.CVAnalyses.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.AnalysisId == analysisId && item.Cv.UserId == userId,
                cancellationToken);

        return analysis is null ? NotFound() : Ok(CvAnalysisDtoMapper.ToDetailDto(analysis));
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue("sub"), out userId);
}
