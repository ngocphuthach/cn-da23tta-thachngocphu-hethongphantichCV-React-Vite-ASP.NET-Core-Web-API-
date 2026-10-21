using System.Security.Claims;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Cvs;
using CvAdvisor.Api.Models.Entities;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/cvs")]
public sealed class CvsController(
    CvCareerDbContext dbContext,
    CvUploadValidator uploadValidator,
    CvFileStorage fileStorage,
    CvAnalysisService analysisService,
    ILogger<CvsController> logger) : ControllerBase
{
    private const int MaxCvsPerUser = 50;

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<CvDto>> Upload(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await dbContext.CVs.CountAsync(cv => cv.UserId == userId, cancellationToken) >= MaxCvsPerUser)
        {
            return Conflict(new { message = "Bạn đã đạt giới hạn 50 CV. Hãy xóa một CV trước khi thêm CV mới." });
        }

        if (file is null || file.Length == 0 || file.Length > CvUploadValidator.MaxFileBytes)
        {
            return BadRequest(new { message = "File CV phải có nội dung và không vượt quá 5 MB." });
        }

        byte[] content;
        await using (var input = file.OpenReadStream())
        using (var buffer = new MemoryStream())
        {
            var chunk = new byte[81920];
            var total = 0;
            int count;
            while ((count = await input.ReadAsync(chunk, cancellationToken)) > 0)
            {
                total += count;
                if (total > CvUploadValidator.MaxFileBytes)
                {
                    return BadRequest(new { message = "File CV không được vượt quá 5 MB." });
                }

                await buffer.WriteAsync(chunk.AsMemory(0, count), cancellationToken);
            }

            content = buffer.ToArray();
        }

        string extension;
        try
        {
            extension = uploadValidator.ValidateAndGetExtension(file.FileName, content);
        }
        catch (InvalidCvUploadException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        var safeOriginalName = SanitizeFileName(file.FileName);
        var title = Path.GetFileNameWithoutExtension(safeOriginalName);
        if (string.IsNullOrWhiteSpace(title))
        {
            title = "CV";
        }

        if (title.Length > 150)
        {
            title = title[..150];
        }

        string storageKey;
        try
        {
            storageKey = await fileStorage.SaveAsync(userId, extension, content, cancellationToken);
        }
        catch (IOException)
        {
            return Problem(statusCode: StatusCodes.Status500InternalServerError,
                title: "Không thể lưu file CV hiện tại.");
        }
        catch (UnauthorizedAccessException)
        {
            return Problem(statusCode: StatusCodes.Status500InternalServerError,
                title: "Không thể lưu file CV hiện tại.");
        }

        var cv = new Cv
        {
            UserId = userId,
            SourceType = CvSourceType.Upload,
            Title = title,
            OriginalFileName = safeOriginalName,
            FileExtension = extension,
            FileStorageKey = storageKey,
        };
        dbContext.CVs.Add(cv);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            try
            {
                await fileStorage.DeleteAsync(storageKey);
            }
            catch
            {
                // The failed upload is not exposed; an unreferenced file may need cleanup.
            }

            throw;
        }

        return StatusCode(StatusCodes.Status201Created, ToDto(cv));
    }

    [HttpPost("manual")]
    [EnableRateLimiting("ManualCvByUser")]
    public async Task<ActionResult<CvDto>> CreateManual(
        ManualCvRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        if (!ManualCvContent.TryNormalize(request, out var title, out var content, out var validationError))
        {
            return BadRequest(new { message = validationError });
        }

        if (await dbContext.CVs.CountAsync(cv => cv.UserId == userId, cancellationToken) >= MaxCvsPerUser)
        {
            return Conflict(new { message = "Bạn đã đạt giới hạn 50 CV. Hãy xóa một CV trước khi thêm CV mới." });
        }

        var cv = new Cv
        {
            UserId = userId,
            SourceType = CvSourceType.Manual,
            Title = title,
            ContentText = ManualCvContent.Serialize(content),
        };
        dbContext.CVs.Add(cv);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToDto(cv));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CvDto>>> ListMine(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var cvs = await dbContext.CVs.AsNoTracking()
            .Where(cv => cv.UserId == userId)
            .OrderByDescending(cv => cv.CreatedAt)
            .ThenBy(cv => cv.CvId)
            .Select(cv => new CvDto(cv.CvId, cv.Title, (byte)cv.SourceType, cv.OriginalFileName, cv.FileExtension, cv.CreatedAt))
            .ToListAsync(cancellationToken);
        return Ok(cvs);
    }

    [HttpGet("{cvId:guid}/content")]
    public async Task<ActionResult<ManualCvContentDto>> GetManualContent(
        Guid cvId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var cv = await dbContext.CVs.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CvId == cvId && item.UserId == userId, cancellationToken);
        if (cv is null || cv.SourceType != CvSourceType.Manual) return NotFound();

        var content = ManualCvContent.Deserialize(cv.ContentText);
        if (content is null) return NotFound();
        Response.Headers.CacheControl = "no-store";
        return Ok(new ManualCvContentDto(cv.Title, content.Education, content.Skills,
            content.Experience, content.Projects, content.Objective));
    }

    [HttpGet("{cvId:guid}/analyses")]
    public async Task<ActionResult<IReadOnlyList<CvAnalysisListDto>>> ListCvAnalyses(
        Guid cvId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var ownsCv = await dbContext.CVs.AsNoTracking()
            .AnyAsync(cv => cv.CvId == cvId && cv.UserId == userId, cancellationToken);
        if (!ownsCv)
        {
            return NotFound();
        }

        await analysisService.MarkExpiredPendingForUserAsync(userId, cvId, cancellationToken);
        var analyses = await dbContext.CVAnalyses.AsNoTracking()
            .Where(analysis => analysis.CvId == cvId && analysis.Cv.UserId == userId)
            .OrderByDescending(analysis => analysis.CreatedAt)
            .ThenBy(analysis => analysis.AnalysisId)
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

        return Ok(analyses.Select(analysis => CvAnalysisDtoMapper.ToListDto(
            analysis.AnalysisId,
            analysis.CvId,
            analysis.CreatedAt,
            analysis.Status,
            analysis.OverallScore,
            analysis.ResultJson)).ToArray());
    }

    [HttpPost("{cvId:guid}/analyses")]
    [EnableRateLimiting("CvAnalysisByUser")]
    public async Task<ActionResult<CvAnalysisDetailDto>> Analyze(
        Guid cvId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var analysis = await analysisService.AnalyzeAsync(userId, cvId, cancellationToken);
            return Ok(CvAnalysisDtoMapper.ToDetailDto(analysis));
        }
        catch (OwnedCvNotFoundException)
        {
            return NotFound();
        }
        catch (AnalysisAlreadyPendingException)
        {
            return Conflict(new { message = "CV này đang được phân tích. Hãy thử lại sau." });
        }
        catch (AnalysisRunFailedException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                analysisId = exception.AnalysisId,
                message = "Không thể phân tích CV lúc này. Vui lòng thử lại sau.",
            });
        }
    }

    [HttpDelete("{cvId:guid}")]
    public async Task<IActionResult> Delete(Guid cvId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var cv = await dbContext.CVs.SingleOrDefaultAsync(
            item => item.CvId == cvId && item.UserId == userId,
            cancellationToken);
        if (cv is null)
        {
            return NotFound();
        }

        var storageKey = cv.FileStorageKey;
        dbContext.CVs.Remove(cv);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await fileStorage.DeleteAsync(storageKey);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or InvalidOperationException)
        {
            logger.LogWarning("Could not clean stored CV file after CV deletion. CvId: {CvId}", cvId);
        }

        return NoContent();
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue("sub"), out userId);

    private static CvDto ToDto(Cv cv) =>
        new(cv.CvId, cv.Title, (byte)cv.SourceType, cv.OriginalFileName, cv.FileExtension, cv.CreatedAt);

    private static string SanitizeFileName(string fileName)
    {
        var basename = Path.GetFileName(fileName.Replace('\\', '/'));
        var safe = new string(basename.Where(character => !char.IsControl(character)).ToArray()).Trim();
        if (safe.Length > 255)
        {
            safe = safe[^255..];
        }

        return string.IsNullOrWhiteSpace(safe) ? "cv-upload" : safe;
    }
}
