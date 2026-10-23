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

    public string Role { get; set; } = UserRoles.User;

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public byte[] RowVersion { get; set; } = null!;

    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();
}

public static class UserRoles
{
    public const string User = "User";
    public const string Admin = "Admin";
}
