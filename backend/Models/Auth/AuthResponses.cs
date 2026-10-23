namespace CvAdvisor.Api.Models.Auth;

public sealed record UserProfileResponse(Guid UserId, string Email, string FullName, string Role);

public sealed record LoginResponse(
    string AccessToken,
    string TokenType,
    DateTime ExpiresAtUtc,
    UserProfileResponse User);
