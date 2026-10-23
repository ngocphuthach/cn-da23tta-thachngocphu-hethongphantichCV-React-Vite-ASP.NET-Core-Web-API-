namespace CvAdvisor.Api.Configuration;

public sealed class AdminApiRateLimitOptions
{
    public int PermitLimit { get; set; } = 60;

    public int WindowMinutes { get; set; } = 1;
}
