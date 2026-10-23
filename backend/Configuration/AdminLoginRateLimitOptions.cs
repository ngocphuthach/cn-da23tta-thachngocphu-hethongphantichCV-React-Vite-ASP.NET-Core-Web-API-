namespace CvAdvisor.Api.Configuration;

public sealed class AdminLoginRateLimitOptions
{
    public int PermitLimit { get; set; } = 5;

    public int WindowMinutes { get; set; } = 1;
}
