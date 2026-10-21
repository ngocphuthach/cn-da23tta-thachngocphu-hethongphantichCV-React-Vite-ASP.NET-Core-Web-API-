namespace CvAdvisor.Api.Services;

public sealed class CvFileStorage(IConfiguration configuration, IWebHostEnvironment environment)
{
    private readonly string _rootPath = ResolveRoot(configuration, environment);

    public async Task<string> SaveAsync(
        Guid userId,
        string extension,
        ReadOnlyMemory<byte> content,
        CancellationToken cancellationToken)
    {
        var relativeDirectory = userId.ToString("N");
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var relativeKey = $"{relativeDirectory}/{storedFileName}";
        var fullPath = ResolvePath(relativeKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        try
        {
            await using var stream = new FileStream(
                fullPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true);
            await stream.WriteAsync(content, cancellationToken);
        }
        catch
        {
            try
            {
                File.Delete(fullPath);
            }
            catch
            {
                // A partial file has a random name and is not referenced by the database.
            }

            throw;
        }

        return relativeKey;
    }

    public string GetFullPath(string storageKey) => ResolvePath(storageKey);

    public Task DeleteAsync(string? storageKey)
    {
        if (!string.IsNullOrWhiteSpace(storageKey))
        {
            var path = ResolvePath(storageKey);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        return Task.CompletedTask;
    }

    private string ResolvePath(string storageKey)
    {
        var platformKey = storageKey.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, platformKey));
        var rootPrefix = _rootPath.EndsWith(Path.DirectorySeparatorChar)
            ? _rootPath
            : _rootPath + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Storage key nằm ngoài thư mục lưu CV.");
        }

        return fullPath;
    }

    private static string ResolveRoot(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredPath = configuration["Storage:CvRoot"];
        var defaultBase = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(defaultBase))
        {
            defaultBase = Path.GetTempPath();
        }

        var root = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(defaultBase, "CV-Career-System", "CVs")
            : Path.GetFullPath(configuredPath, environment.ContentRootPath);
        return Path.GetFullPath(root);
    }
}
