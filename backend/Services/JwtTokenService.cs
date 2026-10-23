using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CvAdvisor.Api.Configuration;
using CvAdvisor.Api.Models.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CvAdvisor.Api.Services;

public sealed class JwtTokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
        => CreateToken(user, _options.ExpirationMinutes);

    public (string Token, DateTime ExpiresAtUtc) CreateAdminToken(User user)
    {
        if (!user.IsActive || !string.Equals(user.Role, UserRoles.Admin, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Only Admin accounts can receive an Admin session token.");
        }

        return CreateToken(user, _options.AdminTokenMinutes);
    }

    private (string Token, DateTime ExpiresAtUtc) CreateToken(User user, int expirationMinutes)
    {
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(expirationMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim("role", user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
            SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expiresAt);
    }
}
