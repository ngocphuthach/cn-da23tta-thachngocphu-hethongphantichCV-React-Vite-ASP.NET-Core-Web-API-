namespace CvAdvisor.Api.Configuration;

public sealed class AiServiceOptions
{
    public const string SectionName = "AiService";

    public string BaseUrl { get; set; } = "http://localhost:8000/";

    public string InternalApiKey { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 180;
}
