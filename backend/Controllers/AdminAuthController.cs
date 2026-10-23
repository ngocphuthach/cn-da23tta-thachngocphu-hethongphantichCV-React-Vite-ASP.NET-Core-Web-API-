using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Auth;
using CvAdvisor.Api.Models.Entities;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Controllers;

[ApiController]
[Route("api/admin/auth")]
public sealed class AdminAuthController(
    CvCareerDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokenService,
    ILogger<AdminAuthController> logger) : ControllerBase
{
    private const string InvalidLoginMessage = "Email hoặc mật khẩu không đúng.";
    private static readonly User DummyUser = new() { Email = "invalid-admin@example.invalid" };
    private static readonly string DummyPasswordHash =
        new PasswordHasher<User>().HashPassword(DummyUser, "not-a-real-admin-password-for-timing");

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("AdminLoginByIp")]
    public async Task<ActionResult<LoginResponse>> Login(
        AdminLoginRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        User? user = null;
        try
        {
            user = await dbContext.Users.SingleOrDefaultAsync(
                candidate => candidate.Email == normalizedEmail, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            logger.LogWarning("Admin login could not query account data.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Dịch vụ đăng nhập quản trị tạm thời không khả dụng." });
        }

        PasswordVerificationResult verification;
        try
        {
            verification = passwordHasher.VerifyHashedPassword(
                user ?? DummyUser,
                user?.PasswordHash ?? DummyPasswordHash,
                request.Password);
        }
        catch
        {
            verification = passwordHasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, request.Password);
            user = null;
        }

        if (user is null || verification == PasswordVerificationResult.Failed
            || !user.IsActive || !string.Equals(user.Role, UserRoles.Admin, StringComparison.Ordinal))
        {
            logger.LogWarning("Admin login failed due to invalid credentials or account state.");
            return Unauthorized(new { message = InvalidLoginMessage });
        }

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable, cancellationToken);
            var current = await dbContext.Users.AsNoTracking()
                .Where(candidate => candidate.UserId == user.UserId)
                .Select(candidate => new { candidate.IsActive, candidate.Role })
                .SingleOrDefaultAsync(cancellationToken);
            if (current is null || !current.IsActive
                || !string.Equals(current.Role, UserRoles.Admin, StringComparison.Ordinal))
            {
                logger.LogWarning("Admin login failed due to invalid credentials or account state.");
                return Unauthorized(new { message = InvalidLoginMessage });
            }

            dbContext.AdminCatalogAuditLogs.Add(new AdminCatalogAuditLog
            {
                ActorUserId = user.UserId,
                OccurredAt = DateTime.UtcNow,
                Action = "AdminLogin",
                ObjectType = "Authentication",
                ObjectId = user.UserId.ToString("D"),
            });
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var (token, expiresAtUtc) = tokenService.CreateAdminToken(user);
            return Ok(new LoginResponse(token, "Bearer", expiresAtUtc, ToProfile(user)));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            logger.LogWarning("Admin login audit could not be saved.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Dịch vụ đăng nhập quản trị tạm thời không khả dụng." });
        }
    }

    [Authorize(Roles = UserRoles.Admin)]
    [HttpGet("me")]
    [EnableRateLimiting("AdminByUser")]
    public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();

        var user = await dbContext.Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.UserId == userId
                && candidate.IsActive && candidate.Role == UserRoles.Admin, cancellationToken);
        return user is null ? Unauthorized() : Ok(ToProfile(user));
    }

    private static UserProfileResponse ToProfile(User user) =>
        new(user.UserId, user.Email, user.FullName, user.Role);
}
