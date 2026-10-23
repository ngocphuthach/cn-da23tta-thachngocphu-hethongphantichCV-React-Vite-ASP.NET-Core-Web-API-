using System.ComponentModel.DataAnnotations;

namespace CvAdvisor.Api.Models.Auth;

public sealed class AdminLoginRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(128)]
    public string Password { get; init; } = string.Empty;
}
