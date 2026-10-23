using System.IdentityModel.Tokens.Jwt;
using CvAdvisor.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class ActiveUserRequirement : IAuthorizationRequirement;

public sealed class ActiveUserAuthorizationHandler(
    CvCareerDbContext dbContext,
    ILogger<ActiveUserAuthorizationHandler> logger)
    : AuthorizationHandler<ActiveUserRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ActiveUserRequirement requirement)
    {
        if (!Guid.TryParse(context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var userId))
        {
            context.Fail();
            return;
        }

        try
        {
            var account = await dbContext.Users.AsNoTracking()
                .Where(user => user.UserId == userId)
                .Select(user => new { user.IsActive, user.Role })
                .SingleOrDefaultAsync();

            if (account is null || !account.IsActive)
            {
                context.Fail();
                return;
            }

            var requiredRoles = context.Requirements
                .OfType<RolesAuthorizationRequirement>()
                .SelectMany(item => item.AllowedRoles)
                .ToArray();
            if (requiredRoles.Length > 0 && !requiredRoles.Contains(account.Role, StringComparer.Ordinal))
            {
                context.Fail();
                return;
            }

            context.Succeed(requirement);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch
        {
            logger.LogWarning("Authorization database check failed; request denied.");
            context.Fail();
        }
    }
}

public sealed class DatabaseRoleAuthorizationHandler(
    CvCareerDbContext dbContext,
    ILogger<DatabaseRoleAuthorizationHandler> logger)
    : AuthorizationHandler<RolesAuthorizationRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RolesAuthorizationRequirement requirement)
    {
        if (!Guid.TryParse(context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var userId))
        {
            context.Fail();
            return;
        }

        try
        {
            var account = await dbContext.Users.AsNoTracking()
                .Where(user => user.UserId == userId)
                .Select(user => new { user.IsActive, user.Role })
                .SingleOrDefaultAsync();
            if (account is null || !account.IsActive
                || !requirement.AllowedRoles.Contains(account.Role, StringComparer.Ordinal))
            {
                context.Fail();
                return;
            }

            context.Succeed(requirement);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch
        {
            logger.LogWarning("Role authorization database check failed; request denied.");
            context.Fail();
        }
    }
}
