namespace CvAdvisor.Api.Models.Entities;

public sealed class User
{
    private string _email = string.Empty;

    public Guid UserId { get; set; } = Guid.NewGuid();

    public string Email
    {
        get => _email;
        set => _email = value?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    public string FullName { get; set; } = string.Empty;

    // Chỉ lưu kết quả từ ASP.NET Core Identity PasswordHasher, không lưu mật khẩu thô.
    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();
}
