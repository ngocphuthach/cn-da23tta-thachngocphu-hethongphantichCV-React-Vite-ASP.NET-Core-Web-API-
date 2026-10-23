using System.Data;
using System.Diagnostics;
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
    AiServiceClient aiServiceClient,
    CareerCatalogSnapshotReader catalogSnapshotReader,
    ILogger<CvAnalysisService> logger)
{
    private const int MaxResultJsonBytes = 1024 * 1024;
    private static readonly TimeSpan PendingTimeout = TimeSpan.FromMinutes(10);
    private static readonly JsonSerializerOptions ResultJsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<CvAnalysis> CreatePendingAsync(
        Guid userId,
        Guid cvId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var cv = await dbContext.CVs.SingleOrDefaultAsync(
            item => item.CvId == cvId && item.UserId == userId,
            cancellationToken);
        if (cv is null)
        {
            throw new OwnedCvNotFoundException();
        }

        var now = DateTime.UtcNow;
        var cutoff = now - PendingTimeout;
        var activeAnalyses = await dbContext.CVAnalyses
            .Where(item => item.CvId == cvId
                && (item.Status == CvAnalysisStatus.Pending || item.Status == CvAnalysisStatus.Processing))
            .ToListAsync(cancellationToken);
        foreach (var expired in activeAnalyses.Where(item =>
            item.Status == CvAnalysisStatus.Pending && item.CreatedAt <= cutoff))
        {
            expired.Status = CvAnalysisStatus.Failed;
            expired.ResultJson = BuildFailureResult("Yêu cầu phân tích đã quá hạn trong hàng đợi. Vui lòng thử lại.");
            expired.CompletedAt = now;
            expired.FailureCode = CvAnalysisFailureCode.AiTimeout;
        }

        if (activeAnalyses.Any(item => item.Status == CvAnalysisStatus.Processing
            || (item.Status == CvAnalysisStatus.Pending && item.CreatedAt > cutoff)))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            throw new AnalysisAlreadyPendingException();
        }

        var analysis = new CvAnalysis
        {
            CvId = cv.CvId,
            Status = CvAnalysisStatus.Pending,
            CreatedAt = now,
        };
        dbContext.CVAnalyses.Add(analysis);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return analysis;
    }

    public async Task MarkQueueFailureAsync(Guid analysisId, string safeMessage)
    {
        var analysis = await dbContext.CVAnalyses
            .SingleOrDefaultAsync(item => item.AnalysisId == analysisId, CancellationToken.None);
        if (analysis is null || analysis.Status != CvAnalysisStatus.Pending)
        {
            return;
        }

        analysis.Status = CvAnalysisStatus.Failed;
        analysis.ResultJson = BuildFailureResult(safeMessage);
        analysis.CompletedAt = DateTime.UtcNow;
        analysis.FailureCode = CvAnalysisFailureCode.Unknown;
        await dbContext.SaveChangesAsync(CancellationToken.None);
    }

    public async Task ProcessPendingAsync(Guid analysisId, CancellationToken cancellationToken)
    {
        var totalTimer = Stopwatch.StartNew();
        var aiServiceMs = 0d;
        int? aiServiceHttpStatusCode = null;
        var validationAndScoringMs = 0d;
        var databaseSaveMs = 0d;
        var claimed = await dbContext.CVAnalyses
            .Where(item => item.AnalysisId == analysisId && item.Status == CvAnalysisStatus.Pending)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(item => item.Status, CvAnalysisStatus.Processing), cancellationToken);
        if (claimed == 0)
        {
            return;
        }

        var failureCode = CvAnalysisFailureCode.Unknown;
        try
        {
            var analysis = await dbContext.CVAnalyses
                .SingleAsync(item => item.AnalysisId == analysisId, cancellationToken);
            var cvSource = await dbContext.CVs.AsNoTracking()
                .Where(item => item.CvId == analysis.CvId)
                .Select(item => new { item.SourceType, item.FileStorageKey, item.FileExtension, item.ContentText })
                .SingleAsync(cancellationToken);
            var catalogSnapshot = await catalogSnapshotReader.ReadActiveAsync(cancellationToken);
            failureCode = CvAnalysisFailureCode.FileInvalid;

            string aiJson;
            var aiTimer = Stopwatch.StartNew();
            try
            {
                if (cvSource.SourceType == CvSourceType.Manual)
                {
                    var manualContent = ManualCvContent.Deserialize(cvSource.ContentText)
                        ?? throw new InvalidDataException();
                    var cvText = ManualCvContent.Compose(manualContent);
                    if (cvText.Length > ManualCvContent.MaxTotalCharacters)
                    {
                        throw new InvalidDataException();
                    }

                    failureCode = CvAnalysisFailureCode.AiUnavailable;
                    var aiResponse = await aiServiceClient.AnalyzeTextAsync(cvText, catalogSnapshot, cancellationToken);
                    aiJson = aiResponse.Json;
                    aiServiceMs = aiResponse.ElapsedMilliseconds;
                }
                else
                {
                    var storagePath = fileStorage.GetFullPath(cvSource.FileStorageKey ?? throw new InvalidDataException());
                    var extension = cvSource.FileExtension ?? throw new InvalidDataException();
                    await using var cvStream = new FileStream(
                        storagePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                        bufferSize: 81920, useAsync: true);
                    failureCode = CvAnalysisFailureCode.AiUnavailable;
                    var aiResponse = await aiServiceClient.AnalyzeAsync(cvStream, extension, catalogSnapshot, cancellationToken);
                    aiJson = aiResponse.Json;
                    aiServiceMs = aiResponse.ElapsedMilliseconds;
                }
            }
            catch (AiServiceUnavailableException exception)
            {
                aiServiceHttpStatusCode = exception.HttpStatusCode;
                aiServiceMs = exception.ElapsedMilliseconds;
                throw;
            }
            finally
            {
                aiServiceMs = Math.Max(aiServiceMs, aiTimer.Elapsed.TotalMilliseconds);
            }

            failureCode = CvAnalysisFailureCode.InvalidResult;
            var validationTimer = Stopwatch.StartNew();
            string resultJson;
            decimal? overallScore;
            try
            {
                (resultJson, overallScore) = ValidateAndEnrich(aiJson, catalogSnapshot);
            }
            finally
            {
                validationAndScoringMs += validationTimer.Elapsed.TotalMilliseconds;
            }

            analysis.Status = CvAnalysisStatus.Completed;
            analysis.ResultJson = resultJson;
            analysis.OverallScore = overallScore;
            analysis.CompletedAt = DateTime.UtcNow;
            analysis.AiProvider = null;
            analysis.ModelName = null;
            analysis.FailureCode = null;
            failureCode = CvAnalysisFailureCode.Unknown;
            var saveTimer = Stopwatch.StartNew();
            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            finally
            {
                databaseSaveMs += saveTimer.Elapsed.TotalMilliseconds;
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            dbContext.ChangeTracker.Clear();
            await dbContext.CVAnalyses
                .Where(item => item.AnalysisId == analysisId && item.Status == CvAnalysisStatus.Processing)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(item => item.Status, CvAnalysisStatus.Pending), CancellationToken.None);
        }
        catch (Exception exception)
        {
            failureCode = exception switch
            {
                AiServiceUnavailableException { IsTimeout: true } => CvAnalysisFailureCode.AiTimeout,
                AiServiceUnavailableException { HttpStatusCode: >= 400 and < 500 } => CvAnalysisFailureCode.AiRejected,
                AiServiceUnavailableException => CvAnalysisFailureCode.AiUnavailable,
                _ => failureCode,
            };
            var safeMessage = GetSafeFailureReason(exception);
            try
            {
                dbContext.ChangeTracker.Clear();
                var analysis = await dbContext.CVAnalyses
                    .SingleOrDefaultAsync(item => item.AnalysisId == analysisId, CancellationToken.None);
                if (analysis is not null && analysis.Status == CvAnalysisStatus.Processing)
                {
                    analysis.Status = CvAnalysisStatus.Failed;
                    analysis.ResultJson = BuildFailureResult(safeMessage);
                    analysis.OverallScore = null;
                    analysis.CompletedAt = DateTime.UtcNow;
                    analysis.AiProvider = null;
                    analysis.ModelName = null;
                    analysis.FailureCode = failureCode;
                    var saveTimer = Stopwatch.StartNew();
                    try
                    {
                        await dbContext.SaveChangesAsync(CancellationToken.None);
                    }
                    finally
                    {
                        databaseSaveMs += saveTimer.Elapsed.TotalMilliseconds;
                    }
                }
            }
            catch
            {
                logger.LogWarning(
                    "Could not persist failed CV analysis. AnalysisId={AnalysisId}", analysisId);
            }
        }
        finally
        {
            totalTimer.Stop();
            logger.LogInformation(
                "CvAnalysis timing AnalysisId={AnalysisId} AiServiceMs={AiServiceMs:F2} " +
                "AiServiceHttpStatusCode={AiServiceHttpStatusCode} " +
                "ValidationAndScoringMs={ValidationAndScoringMs:F2} DatabaseSaveMs={DatabaseSaveMs:F2} " +
                "TotalMs={TotalMs:F2}",
                analysisId,
                aiServiceMs,
                aiServiceHttpStatusCode,
                validationAndScoringMs,
                databaseSaveMs,
                totalTimer.Elapsed.TotalMilliseconds);
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
        var failureResult = BuildFailureResult("Yêu cầu phân tích đã quá hạn trong hàng đợi. Vui lòng thử lại.");
        return query.ExecuteUpdateAsync(updates => updates
            .SetProperty(item => item.Status, CvAnalysisStatus.Failed)
            .SetProperty(item => item.ResultJson, failureResult)
            .SetProperty(item => item.FailureCode, CvAnalysisFailureCode.AiTimeout)
            .SetProperty(item => item.CompletedAt, now), cancellationToken);
    }

    private static string BuildFailureResult(string safeMessage) =>
        JsonSerializer.Serialize(new { failureReason = safeMessage }, ResultJsonOptions);

    private static string GetSafeFailureReason(Exception exception) => exception switch
    {
        AiServiceUnavailableException { HttpStatusCode: 400 } =>
            "Dịch vụ AI không xử lý được yêu cầu này. Vui lòng kiểm tra CV rồi thử lại.",
        AiServiceUnavailableException { HttpStatusCode: 401 or 403 } =>
            "Dịch vụ AI chưa được cấp quyền xử lý yêu cầu. Vui lòng liên hệ người quản lý hệ thống.",
        AiServiceUnavailableException { HttpStatusCode: 404 } =>
            "Không tìm thấy endpoint phân tích AI. Vui lòng liên hệ người quản lý hệ thống.",
        AiServiceUnavailableException { HttpStatusCode: 429 } =>
            "Dịch vụ AI đang giới hạn yêu cầu. Vui lòng thử lại sau.",
        AiServiceUnavailableException { HttpStatusCode: null } =>
            "Dịch vụ AI không phản hồi kịp thời hoặc đang mất kết nối. Vui lòng thử lại sau.",
        AiServiceUnavailableException { HttpStatusCode: >= 500 } =>
            "Dịch vụ AI tạm thời gặp lỗi. Vui lòng thử lại sau.",
        _ => "Không thể hoàn tất phân tích CV. Vui lòng thử lại sau.",
    };

    private static (string Json, decimal? OverallScore) ValidateAndEnrich(
        string aiJson,
        CareerCatalogSnapshot catalogSnapshot)
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

        var knownSkillCodes = catalogSnapshot.Skills.Select(skill => skill.Code)
            .ToHashSet(StringComparer.Ordinal);
        if (detectedCodes.Any(code => !knownSkillCodes.Contains(code)))
        {
            throw new InvalidDataException();
        }

        if (catalogSnapshot.JobPositions.SelectMany(position => position.Skills)
            .Any(link => link.Importance is < 1 or > 5))
        {
            throw new InvalidDataException();
        }

        var ranking = catalogSnapshot.JobPositions.Select(position =>
        {
            var requiredSkills = position.Skills.Where(link => link.IsRequired).ToArray();
            var totalImportance = requiredSkills.Sum(link => (int)link.Importance);
            decimal? score = null;
            if (totalImportance > 0)
            {
                var matchedImportance = requiredSkills
                    .Where(link => detectedCodes.Contains(link.Code))
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
        enriched["catalogVersion"] = catalogSnapshot.CatalogVersion;
        enriched["scoringAlgorithm"] = "weighted-required-skills-v1";
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
