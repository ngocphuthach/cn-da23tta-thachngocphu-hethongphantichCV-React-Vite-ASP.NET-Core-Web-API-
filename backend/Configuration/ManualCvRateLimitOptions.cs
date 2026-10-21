namespace CvAdvisor.Api.Configuration;

public sealed class ManualCvRateLimitOptions
{
    public const string SectionName = "RateLimiting:ManualCv";

    public int PermitLimit { get; set; } = 10;

    public int WindowMinutes { get; set; } = 15;
}
