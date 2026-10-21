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
            ParseResult(analysis.ResultJson));

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
