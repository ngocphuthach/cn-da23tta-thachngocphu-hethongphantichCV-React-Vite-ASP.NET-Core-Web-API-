namespace CvAdvisor.Api.Models.Cvs;

public sealed record CvDto(
    Guid CvId,
    string Title,
    byte SourceType,
    string? OriginalFileName,
    string? FileExtension,
    DateTime CreatedAt);

public sealed class ManualCvRequest
{
    public string? Title { get; init; }
    public string? Education { get; init; }
    public string? Skills { get; init; }
    public string? Experience { get; init; }
    public string? Projects { get; init; }
    public string? Objective { get; init; }
}

public sealed record ManualCvContentDto(
    string Title,
    string Education,
    string Skills,
    string Experience,
    string Projects,
    string Objective);
