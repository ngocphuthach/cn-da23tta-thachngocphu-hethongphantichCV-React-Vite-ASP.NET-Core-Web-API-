using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Cvs;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class CvAnalysisService(
    CvCareerDbContext dbContext,
    CvFileStorage fileStorage,
    AiServiceClient aiServiceClient)
{
    private const int MaxResultJsonBytes = 1024 * 1024;
    private static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(10);
    private static readonly JsonSerializerOptions ResultJsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<CvAnalysis> AnalyzeAsync(Guid userId, Guid cvId, CancellationToken cancellationToken)
    {
        CvAnalysis analysis;
        await using (var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken))
        {
            var cv = await dbContext.CVs.SingleOrDefaultAsync(
                item => item.CvId == cvId && item.UserId == userId,
                cancellationToken);
            if (cv is null)
            {
                throw new OwnedCvNotFoundException();
            }

            var now = DateTime.UtcNow;
            var cutoff = now - PendingTimeout;
            var pendingAnalyses = await dbContext.CVAnalyses
                .Where(item => item.CvId == cvId && item.Status == CvAnalysisStatus.Pending)
                .ToListAsync(cancellationToken);
            var activePending = false;
            foreach (var pending in pendingAnalyses)
            {
                if (pending.CreatedAt <= cutoff)
                {
                    pending.Status = CvAnalysisStatus.Failed;
                    pending.CompletedAt = now;
                }
                else
                {
                    activePending = true;
                }
            }

            if (activePending)
            {
                if (pendingAnalyses.Any(item => item.Status == CvAnalysisStatus.Failed))
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                throw new AnalysisAlreadyPendingException();
            }

            if (pendingAnalyses.Count > 0)
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            analysis = new CvAnalysis
            {
                CvId = cv.CvId,
                Status = CvAnalysisStatus.Pending,
                CreatedAt = now,
            };
            dbContext.CVAnalyses.Add(analysis);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        try
        {
            var cvSource = await dbContext.CVs.AsNoTracking()
                .Where(item => item.CvId == cvId && item.UserId == userId)
                .Select(item => new { item.SourceType, item.FileStorageKey, item.FileExtension, item.ContentText })
                .SingleAsync(cancellationToken);

            string aiJson;
            if (cvSource.SourceType == CvSourceType.Manual)
            {
                var manualContent = ManualCvContent.Deserialize(cvSource.ContentText)
                    ?? throw new InvalidDataException();
                var cvText = ManualCvContent.Compose(manualContent);
                if (cvText.Length > ManualCvContent.MaxTotalCharacters)
                {
                    throw new InvalidDataException();
                }

                aiJson = await aiServiceClient.AnalyzeTextAsync(cvText, cancellationToken);
            }
            else
            {
                var storagePath = fileStorage.GetFullPath(cvSource.FileStorageKey ?? throw new InvalidDataException());
                var extension = cvSource.FileExtension ?? throw new InvalidDataException();
                await using var cvStream = new FileStream(
                    storagePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                    bufferSize: 81920, useAsync: true);
                aiJson = await aiServiceClient.AnalyzeAsync(cvStream, extension, cancellationToken);
            }

            var (resultJson, overallScore) = await ValidateAndEnrichAsync(aiJson, cancellationToken);

            analysis.Status = CvAnalysisStatus.Completed;
            analysis.ResultJson = resultJson;
            analysis.OverallScore = overallScore;
            analysis.CompletedAt = DateTime.UtcNow;
            analysis.AiProvider = null;
            analysis.ModelName = null;
            await dbContext.SaveChangesAsync(cancellationToken);
            return analysis;
        }
        catch
        {
            // The response and exception are intentionally not logged or persisted.
            analysis.Status = CvAnalysisStatus.Failed;
            analysis.ResultJson = null;
            analysis.OverallScore = null;
            analysis.CompletedAt = DateTime.UtcNow;
            analysis.AiProvider = null;
            analysis.ModelName = null;
            try
            {
                await dbContext.SaveChangesAsync(CancellationToken.None);
            }
            catch
            {
                // A failed database connection can prevent persisting Failed; the row
                // remains recoverable through the ten-minute pending timeout.
            }

            throw new AnalysisRunFailedException(analysis.AnalysisId);
        }
    }

    public Task<int> MarkExpiredPendingForUserAsync(
        Guid userId,
        Guid? cvId,
        CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow - PendingTimeout;
        var query = dbContext.CVAnalyses.Where(item =>
            item.Cv.UserId == userId
            && item.Status == CvAnalysisStatus.Pending
            && item.CreatedAt <= cutoff);
        if (cvId.HasValue)
        {
            query = query.Where(item => item.CvId == cvId.Value);
        }

        var now = DateTime.UtcNow;
        return query.ExecuteUpdateAsync(updates => updates
            .SetProperty(item => item.Status, CvAnalysisStatus.Failed)
            .SetProperty(item => item.CompletedAt, now), cancellationToken);
    }

    private async Task<(string Json, decimal? OverallScore)> ValidateAndEnrichAsync(
        string aiJson,
        CancellationToken cancellationToken)
    {
        if (System.Text.Encoding.UTF8.GetByteCount(aiJson) > MaxResultJsonBytes)
        {
            throw new InvalidDataException();
        }

        using var document = JsonDocument.Parse(aiJson, new JsonDocumentOptions { MaxDepth = 32 });
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object
            || !root.TryGetProperty("schemaVersion", out var schemaVersion)
            || schemaVersion.ValueKind != JsonValueKind.String
            || schemaVersion.GetString() != "1.0"
            || !root.TryGetProperty("detectedSkills", out var detectedSkills)
            || detectedSkills.ValueKind != JsonValueKind.Array
            || !root.TryGetProperty("careerRecommendations", out var recommendations)
            || recommendations.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidDataException();
        }

        var detectedCodes = new HashSet<string>(StringComparer.Ordinal);
        var evidenceUnverifiedCount = 0;
        foreach (var skill in detectedSkills.EnumerateArray())
        {
            if (skill.ValueKind != JsonValueKind.Object
                || !skill.TryGetProperty("skillCode", out var codeElement)
                || codeElement.ValueKind != JsonValueKind.String
                || !skill.TryGetProperty("evidenceVerified", out var verifiedElement)
                || verifiedElement.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
            {
                throw new InvalidDataException();
            }

            var code = codeElement.GetString();
            if (string.IsNullOrWhiteSpace(code))
            {
                throw new InvalidDataException();
            }

            detectedCodes.Add(code);
            if (!verifiedElement.GetBoolean())
            {
                evidenceUnverifiedCount++;
            }
        }

        var knownSkillCodes = await dbContext.Skills.AsNoTracking()
            .Select(skill => skill.Code)
            .ToHashSetAsync(StringComparer.Ordinal, cancellationToken);
        if (detectedCodes.Any(code => !knownSkillCodes.Contains(code)))
        {
            throw new InvalidDataException();
        }

        var positions = await dbContext.JobPositions.AsNoTracking()
            .Include(position => position.JobPositionSkills)
                .ThenInclude(link => link.Skill)
            .ToListAsync(cancellationToken);
        if (positions.SelectMany(position => position.JobPositionSkills)
            .Any(link => link.Importance is < 1 or > 5))
        {
            throw new InvalidDataException();
        }

        var ranking = positions.Select(position =>
        {
            var requiredSkills = position.JobPositionSkills.Where(link => link.IsRequired).ToArray();
            var totalImportance = requiredSkills.Sum(link => (int)link.Importance);
            decimal? score = null;
            if (totalImportance > 0)
            {
                var matchedImportance = requiredSkills
                    .Where(link => detectedCodes.Contains(link.Skill.Code))
                    .Sum(link => (int)link.Importance);
                score = Math.Round(100m * matchedImportance / totalImportance, 2, MidpointRounding.AwayFromZero);
            }

            return new CvAnalysisRankingEntry(position.Code, position.Name, score);
        })
        .OrderByDescending(item => item.BackendFitScore.HasValue)
        .ThenByDescending(item => item.BackendFitScore)
        .ThenBy(item => item.JobPositionCode, StringComparer.Ordinal)
        .ToArray();

        var enriched = JsonNode.Parse(aiJson)?.AsObject() ?? throw new InvalidDataException();
        enriched["backendRanking"] = JsonSerializer.SerializeToNode(ranking, ResultJsonOptions);
        enriched["evidenceUnverifiedCount"] = evidenceUnverifiedCount;
        var serialized = enriched.ToJsonString();
        if (System.Text.Encoding.UTF8.GetByteCount(serialized) > MaxResultJsonBytes)
        {
            throw new InvalidDataException();
        }

        var overallScore = ranking
            .Where(item => item.BackendFitScore.HasValue)
            .Select(item => item.BackendFitScore!.Value)
            .DefaultIfEmpty()
            .Max();
        decimal? resultScore = ranking.Any(item => item.BackendFitScore.HasValue)
            ? overallScore
            : null;
        return (serialized, resultScore);
    }
}

public sealed class OwnedCvNotFoundException : Exception
{
}

public sealed class AnalysisAlreadyPendingException : Exception
{
}

public sealed class AnalysisRunFailedException(Guid analysisId) : Exception
{
    public Guid AnalysisId { get; } = analysisId;
}
