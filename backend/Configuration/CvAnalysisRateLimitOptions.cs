namespace CvAdvisor.Api.Configuration;

public sealed class CvAnalysisRateLimitOptions
{
    public const string SectionName = "RateLimiting:CvAnalysis";

    public int PermitLimit { get; set; } = 5;

    public int WindowMinutes { get; set; } = 15;
}
