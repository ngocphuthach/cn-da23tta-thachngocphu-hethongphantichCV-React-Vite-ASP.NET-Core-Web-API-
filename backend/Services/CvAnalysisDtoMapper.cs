using System.Text.Json;
using CvAdvisor.Api.Models.Cvs;
using CvAdvisor.Api.Models.Entities;

namespace CvAdvisor.Api.Services;

public static class CvAnalysisDtoMapper
{
    public static CvAnalysisListDto ToListDto(
        Guid analysisId,
        Guid cvId,
        DateTime createdAt,
        CvAnalysisStatus status,
        decimal? overallScore,
        string? resultJson) =>
        new(analysisId, cvId, createdAt, status.ToString(), overallScore, GetBestJobCode(resultJson));

    public static CvAnalysisDetailDto ToDetailDto(CvAnalysis analysis) =>
        new(
            analysis.AnalysisId,
            analysis.CvId,
            analysis.CreatedAt,
            analysis.CompletedAt,
            analysis.Status.ToString(),
            analysis.OverallScore,
            analysis.Status == CvAnalysisStatus.Failed ? null : ParseResult(analysis.ResultJson),
            analysis.Status == CvAnalysisStatus.Failed ? ParseFailureReason(analysis.ResultJson) : null);

    private static string ParseFailureReason(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
        {
            return "Không thể hoàn tất phân tích CV. Vui lòng thử lại sau.";
        }

        try
        {
            using var document = JsonDocument.Parse(resultJson);
            if (document.RootElement.ValueKind == JsonValueKind.Object
                && document.RootElement.TryGetProperty("failureReason", out var reason)
                && reason.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(reason.GetString()))
            {
                return reason.GetString()!;
            }
        }
        catch (JsonException)
        {
            // A failed analysis should not expose a malformed stored result.
        }

        return "Không thể hoàn tất phân tích CV. Vui lòng thử lại sau.";
    }

    private static string? GetBestJobCode(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(resultJson);
            if (!document.RootElement.TryGetProperty("backendRanking", out var ranking)
                || ranking.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var entry in ranking.EnumerateArray())
            {
                if (entry.ValueKind == JsonValueKind.Object
                    && entry.TryGetProperty("backendFitScore", out var score)
                    && score.ValueKind == JsonValueKind.Number
                    && entry.TryGetProperty("jobPositionCode", out var code)
                    && code.ValueKind == JsonValueKind.String)
                {
                    return code.GetString();
                }
            }
        }
        catch (JsonException)
        {
            // Database CHECK constraints normally prevent invalid stored JSON.
        }

        return null;
    }

    private static JsonElement? ParseResult(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
        {
            return null;
        }

        using var document = JsonDocument.Parse(resultJson);
        return document.RootElement.Clone();
    }
}
