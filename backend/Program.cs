using CvAdvisor.Api.Data;
using CvAdvisor.Api.Configuration;
using CvAdvisor.Api.Models.Entities;
using CvAdvisor.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Trong môi trường phát triển, ghi log ra Console để không phụ thuộc quyền Windows Event Log.
if (builder.Environment.IsDevelopment())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
}

// Add services to the container.

builder.Services.AddControllers();

builder.Services
    .AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(options => !string.IsNullOrWhiteSpace(options.SigningKey),
        "Thiếu cấu hình Jwt:SigningKey. Hãy đặt bằng User Secrets hoặc biến môi trường Jwt__SigningKey.")
    .Validate(options => options.SigningKey is { Length: >= 32 },
        "Jwt:SigningKey phải có ít nhất 32 ký tự.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer),
        "Thiếu cấu hình Jwt:Issuer trong appsettings.json.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Audience),
        "Thiếu cấu hình Jwt:Audience trong appsettings.json.")
    .Validate(options => options.ExpirationMinutes > 0,
        "Jwt:ExpirationMinutes phải lớn hơn 0.")
    .ValidateOnStart();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SigningKey"] ?? string.Empty)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<JwtTokenService>();

builder.Services
    .AddOptions<AiServiceOptions>()
    .BindConfiguration(AiServiceOptions.SectionName)
    .Validate(options => Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps),
        "AiService:BaseUrl phải là URL HTTP hoặc HTTPS tuyệt đối.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.InternalApiKey),
        "Thiếu AiService:InternalApiKey. Hãy đặt bằng User Secrets hoặc biến môi trường AiService__InternalApiKey.")
    .Validate(options => options.TimeoutSeconds > 0,
        "AiService:TimeoutSeconds phải lớn hơn 0.")
    .ValidateOnStart();

builder.Services.AddHttpClient<AiServiceClient>((serviceProvider, client) =>
{
    var aiOptions = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiServiceOptions>>().Value;
    client.BaseAddress = new Uri(aiOptions.BaseUrl.EndsWith('/') ? aiOptions.BaseUrl : aiOptions.BaseUrl + '/');
    client.Timeout = TimeSpan.FromSeconds(aiOptions.TimeoutSeconds);
});
builder.Services.AddSingleton<CvUploadValidator>();
builder.Services.AddSingleton<CvFileStorage>();
builder.Services.AddScoped<CvAnalysisService>();

var cvAnalysisRateLimit = builder.Configuration
    .GetSection(CvAnalysisRateLimitOptions.SectionName)
    .Get<CvAnalysisRateLimitOptions>() ?? new CvAnalysisRateLimitOptions();
if (cvAnalysisRateLimit.PermitLimit <= 0 || cvAnalysisRateLimit.WindowMinutes <= 0)
{
    throw new InvalidOperationException(
        "RateLimiting:CvAnalysis:PermitLimit và WindowMinutes phải lớn hơn 0.");
}

var manualCvRateLimit = builder.Configuration
    .GetSection(ManualCvRateLimitOptions.SectionName)
    .Get<ManualCvRateLimitOptions>() ?? new ManualCvRateLimitOptions();
if (manualCvRateLimit.PermitLimit <= 0 || manualCvRateLimit.WindowMinutes <= 0)
{
    throw new InvalidOperationException(
        "RateLimiting:ManualCv:PermitLimit và WindowMinutes phải lớn hơn 0.");
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("AuthByIp", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("CvAnalysisByUser", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirstValue("sub") ?? "unauthenticated",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = cvAnalysisRateLimit.PermitLimit,
                Window = TimeSpan.FromMinutes(cvAnalysisRateLimit.WindowMinutes),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("ManualCvByUser", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirstValue("sub") ?? "unauthenticated",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = manualCvRateLimit.PermitLimit,
                Window = TimeSpan.FromMinutes(manualCvRateLimit.WindowMinutes),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});

// Connection string comes from User Secrets in Development or the
// ConnectionStrings__DefaultConnection environment variable.
builder.Services.AddDbContext<CvCareerDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Sinh tai lieu OpenAPI (JSON) tai /openapi/v1.json
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Dán access token JWT vào đây.",
        };

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, _) =>
    {
        var endpointMetadata = context.Description.ActionDescriptor.EndpointMetadata;
        var requiresAuthorization = endpointMetadata.OfType<IAuthorizeData>().Any();
        var allowsAnonymous = endpointMetadata.OfType<IAllowAnonymous>().Any();

        if (requiresAuthorization && !allowsAnonymous)
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer")] = [],
            });
        }

        return Task.CompletedTask;
    });
});

const string CorsPolicy = "FrontendPolicy";
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];
allowedOrigins = allowedOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();
if (allowedOrigins.Contains("*", StringComparer.Ordinal))
{
    throw new InvalidOperationException("Cors:AllowedOrigins không được chứa wildcard '*'.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins);
        }

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Endpoint tra ve file OpenAPI JSON
    app.MapOpenApi();

    // Swagger UI (giao dien thu API) - doc tu file OpenAPI o tren
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Career Compass API v1");
    });
}

if (!string.Equals(
    Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
    "true",
    StringComparison.OrdinalIgnoreCase))
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .AllowAnonymous()
    .DisableRateLimiting();

app.Run();
