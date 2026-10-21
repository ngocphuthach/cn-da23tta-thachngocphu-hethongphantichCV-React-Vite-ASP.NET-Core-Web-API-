using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Auth;
using CvAdvisor.Api.Models.Entities;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    CvCareerDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokenService) : ControllerBase
{
    private const string InvalidLoginMessage = "Email hoặc mật khẩu không đúng.";

    [HttpPost("register")]
    [EnableRateLimiting("AuthByIp")]
    public async Task<ActionResult<UserProfileResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            ModelState.AddModelError(nameof(request.FullName), "Họ tên không được để trống.");
            return ValidationProblem(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
        {
            return Conflict(new { message = "Email đã được sử dụng." });
        }

        var user = new User
        {
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Handle a concurrent registration that passed the pre-check.
            if (await dbContext.Users.AnyAsync(existing => existing.Email == normalizedEmail, cancellationToken))
            {
                return Conflict(new { message = "Email đã được sử dụng." });
            }

            throw;
        }

        return StatusCode(StatusCodes.Status201Created, ToProfile(user));
    }

    [HttpPost("login")]
    [EnableRateLimiting("AuthByIp")]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users
            .SingleOrDefaultAsync(candidate => candidate.Email == normalizedEmail, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return Unauthorized(new { message = InvalidLoginMessage });
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = InvalidLoginMessage });
        }

        var (token, expiresAtUtc) = tokenService.CreateToken(user);
        return Ok(new LoginResponse(
            token,
            "Bearer",
            expiresAtUtc,
            ToProfile(user)));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(subject, out var userId))
        {
            return Unauthorized();
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.UserId == userId && candidate.IsActive, cancellationToken);
        return user is null ? Unauthorized() : Ok(ToProfile(user));
    }

    private static UserProfileResponse ToProfile(User user) =>
        new(user.UserId, user.Email, user.FullName);
}
