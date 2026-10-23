using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CvAdvisor.Api.Data;

public sealed class CvCareerDbContextFactory : IDesignTimeDbContextFactory<CvCareerDbContext>
{
    public CvCareerDbContext CreateDbContext(string[] args)
    {
        var configurationBuilder = new ConfigurationBuilder();
        if (!string.Equals(
            Environment.GetEnvironmentVariable("CVCAREER_SKIP_USER_SECRETS"), "true",
            StringComparison.OrdinalIgnoreCase))
        {
            configurationBuilder.AddUserSecrets<CvCareerDbContextFactory>(optional: true);
        }
        var configuration = configurationBuilder.AddEnvironmentVariables().Build();

        var options = new DbContextOptionsBuilder<CvCareerDbContext>()
            .UseSqlServer(configuration.GetConnectionString("DefaultConnection"))
            .Options;

        return new CvCareerDbContext(options);
    }
}
