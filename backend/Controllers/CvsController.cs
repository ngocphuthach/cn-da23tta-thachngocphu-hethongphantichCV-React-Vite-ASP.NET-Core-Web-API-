using System.Security.Claims;
using System.Text.Json;
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
    AnalysisWorkQueue analysisWorkQueue,
    AiServiceClient aiServiceClient,
    EmployerJobService employerJobService,
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
    public async Task<ActionResult<CvAnalysisStartedDto>> Analyze(
        Guid cvId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var analysis = await analysisService.CreatePendingAsync(userId, cvId, cancellationToken);
            if (!analysisWorkQueue.TryEnqueue(analysis.AnalysisId))
            {
                const string queueFullMessage = "Hệ thống đang bận xử lý các yêu cầu phân tích. Vui lòng thử lại sau.";
                await analysisService.MarkQueueFailureAsync(analysis.AnalysisId, queueFullMessage);
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new { message = queueFullMessage });
            }

            var response = new CvAnalysisStartedDto(
                analysis.AnalysisId,
                analysis.Status.ToString(),
                "Yêu cầu đã được tiếp nhận. Kết quả sẽ hiển thị khi phân tích hoàn tất.");
            return Accepted($"/api/cv-analyses/{analysis.AnalysisId}", response);
        }
        catch (OwnedCvNotFoundException)
        {
            return NotFound();
        }
        catch (AnalysisAlreadyPendingException)
        {
            return Conflict(new { message = "CV này đang được phân tích. Hãy thử lại sau." });
        }
    }

    public sealed record MatchJobRequest(
        string? CompanyName,
        string? PositionTitle,
        string Requirements);

    [HttpPost("{cvId:guid}/match-job")]
    [EnableRateLimiting("CvAnalysisByUser")]
    public async Task<IActionResult> MatchJob(
        Guid cvId,
        [FromBody] MatchJobRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request?.Requirements))
        {
            return BadRequest(new { message = "Vui lòng nhập yêu cầu tuyển dụng của nhà tuyển dụng." });
        }

        var company = string.IsNullOrWhiteSpace(request.CompanyName) ? "Nhà tuyển dụng" : request.CompanyName.Trim();
        var position = string.IsNullOrWhiteSpace(request.PositionTitle) ? "Vị trí tuyển dụng" : request.PositionTitle.Trim();
        var requirements = request.Requirements.Trim();

        return await MatchOwnedCvAsync(cvId, userId, null, company, position, requirements, cancellationToken);
    }

    [HttpPost("{cvId:guid}/match-posting/{postingId:int}")]
    [EnableRateLimiting("CvAnalysisByUser")]
    public async Task<IActionResult> MatchPosting(Guid cvId, int postingId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var posting = await employerJobService.GetMatchablePostingAsync(postingId, cancellationToken);
        if (posting is null) return NotFound(new { message = "Tin tuyển dụng không còn hoạt động hoặc đã hết hạn." });
        return await MatchOwnedCvAsync(cvId, userId, postingId, posting.Employer.Name, posting.Title,
            posting.Requirements, cancellationToken);
    }

    private async Task<IActionResult> MatchOwnedCvAsync(Guid cvId, Guid userId, int? postingId, string company,
        string position, string requirements, CancellationToken cancellationToken)
    {
        var cv = await dbContext.CVs.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CvId == cvId && item.UserId == userId, cancellationToken);
        if (cv is null) return NotFound();

        try
        {
            AiServiceResponse response;
            if (cv.SourceType == CvSourceType.Manual)
            {
                var manualContent = ManualCvContent.Deserialize(cv.ContentText) ?? throw new InvalidDataException();
                var cvText = ManualCvContent.Compose(manualContent);
                response = await aiServiceClient.MatchJobTextAsync(cvText, company, position, requirements, cancellationToken);
            }
            else
            {
                var storagePath = fileStorage.GetFullPath(cv.FileStorageKey ?? throw new InvalidDataException());
                var extension = cv.FileExtension ?? throw new InvalidDataException();
                await using var cvStream = new FileStream(
                    storagePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                    bufferSize: 81920, useAsync: true);
                response = await aiServiceClient.MatchJobAsync(cvStream, extension, company, position, requirements, cancellationToken);
            }

            try
            {
                using var doc = JsonDocument.Parse(response.Json);
                var root = doc.RootElement;
                decimal? score = root.TryGetProperty("matchScore", out var scoreProp) && scoreProp.TryGetDecimal(out var parsedScore)
                    ? Math.Clamp(parsedScore, 0m, 100m)
                    : null;
                var verdict = root.TryGetProperty("verdict", out var verdictProp) && verdictProp.ValueKind == JsonValueKind.String
                    ? (verdictProp.GetString() ?? "Khá phù hợp")
                    : "Khá phù hợp";
                if (verdict.Length > 150) verdict = verdict[..150];

                var matchRecord = new CvJobMatch
                {
                    CvId = cvId,
                    EmployerJobPostingId = postingId,
                    CompanyName = company.Length > 200 ? company[..200] : company,
                    PositionTitle = position.Length > 200 ? position[..200] : position,
                    MatchScore = score,
                    Verdict = verdict,
                    ResultJson = response.Json,
                };
                dbContext.CvJobMatches.Add(matchRecord);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex) when (ex is JsonException or DbUpdateException)
            {
                logger.LogWarning(ex, "Could not persist CV job match history for CvId {CvId}.", cvId);
            }

            return Content(response.Json, "application/json");
        }
        catch (AiServiceUnavailableException ex)
        {
            logger.LogWarning(ex, "Could not match CV with recruiter requirements.");
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "Dịch vụ AI tạm thời không thể phân tích độ khớp với nhà tuyển dụng. Vui lòng thử lại sau." });
        }
    }

    public sealed record CvJobMatchHistoryDto(
        Guid MatchId,
        Guid CvId,
        string CvTitle,
        int? EmployerJobPostingId,
        string CompanyName,
        string PositionTitle,
        decimal? MatchScore,
        string Verdict,
        string ResultJson,
        DateTime CreatedAt);

    [HttpGet("job-matches")]
    public async Task<ActionResult<IReadOnlyList<CvJobMatchHistoryDto>>> ListJobMatches(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var matches = await dbContext.CvJobMatches
            .AsNoTracking()
            .Where(item => item.Cv.UserId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .Take(20)
            .Select(item => new CvJobMatchHistoryDto(
                item.MatchId,
                item.CvId,
                item.Cv.Title,
                item.EmployerJobPostingId,
                item.CompanyName,
                item.PositionTitle,
                item.MatchScore,
                item.Verdict,
                item.ResultJson,
                item.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(matches);
    }

    [HttpDelete("job-matches/{matchId:guid}")]
    public async Task<IActionResult> DeleteJobMatch(Guid matchId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var match = await dbContext.CvJobMatches
            .SingleOrDefaultAsync(item => item.MatchId == matchId && item.Cv.UserId == userId, cancellationToken);
        if (match is null) return NotFound();

        dbContext.CvJobMatches.Remove(match);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
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
