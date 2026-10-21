using System.Text.Json;

namespace CvAdvisor.Api.Models.Cvs;

public static class ManualCvContent
{
    public const int MaxTotalCharacters = 30_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static bool TryNormalize(ManualCvRequest request, out string title, out ManualCvContentDto content, out string error)
    {
        title = Clean(request.Title);
        var education = Clean(request.Education);
        var skills = Clean(request.Skills);
        var experience = Clean(request.Experience);
        var projects = Clean(request.Projects);
        var objective = Clean(request.Objective);

        content = new ManualCvContentDto(title, education, skills, experience, projects, objective);
        if (title.Length == 0 || title.Length > 150)
        {
            error = "Tiêu đề CV là bắt buộc và không được vượt quá 150 ký tự.";
            return false;
        }

        if (education.Length > 5_000 || skills.Length > 5_000 || experience.Length > 10_000
            || projects.Length > 10_000 || objective.Length > 3_000)
        {
            error = "Một hoặc nhiều phần CV vượt quá giới hạn ký tự.";
            return false;
        }

        var hasRequiredSection = new[] { education, skills, experience, projects }
            .Any(value => !string.IsNullOrWhiteSpace(value));
        var inputCharacters = education.Length + skills.Length + experience.Length + projects.Length + objective.Length;
        var composed = Compose(content);
        if (!hasRequiredSection || inputCharacters < 100)
        {
            error = "Hãy nhập ít nhất một phần học vấn, kỹ năng, kinh nghiệm hoặc dự án; nội dung CV cần tối thiểu 100 ký tự.";
            return false;
        }

        if (composed.Length > MaxTotalCharacters)
        {
            error = "Tổng nội dung CV không được vượt quá 30.000 ký tự.";
            return false;
        }

        error = string.Empty;
        return true;
    }

    public static string Serialize(ManualCvContentDto content) => JsonSerializer.Serialize(content, JsonOptions);

    public static ManualCvContentDto? Deserialize(string? contentText)
    {
        if (string.IsNullOrWhiteSpace(contentText)) return null;
        try { return JsonSerializer.Deserialize<ManualCvContentDto>(contentText, JsonOptions); }
        catch (JsonException) { return null; }
    }

    public static string Compose(ManualCvContentDto content)
    {
        var sections = new[]
        {
            ("Học vấn", content.Education),
            ("Kỹ năng", content.Skills),
            ("Kinh nghiệm", content.Experience),
            ("Dự án", content.Projects),
            ("Mục tiêu", content.Objective),
        };
        return string.Join("\n\n", sections
            .Where(section => !string.IsNullOrWhiteSpace(section.Item2))
            .Select(section => $"{section.Item1}:\n{section.Item2}"));
    }

    private static string Clean(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var filtered = new string(value.Select(character =>
            char.IsControl(character) && (character is '\r' or '\n' or '\t') ? ' ' : character)
            .Where(character => !char.IsControl(character)).ToArray());
        filtered = filtered.Trim();
        return filtered;
    }
}
