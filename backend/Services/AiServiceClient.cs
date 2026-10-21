using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Diagnostics;
using CvAdvisor.Api.Configuration;
using Microsoft.Extensions.Options;

namespace CvAdvisor.Api.Services;

public sealed class AiServiceClient(HttpClient httpClient, IOptions<AiServiceOptions> options)
{
    private const int MaxResponseBytes = 1024 * 1024;
    private readonly AiServiceOptions _options = options.Value;

    public async Task<AiServiceResponse> AnalyzeAsync(
        Stream cvStream,
        string extension,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "analyze");
        using var multipart = new MultipartFormDataContent();
        using var fileContent = new StreamContent(cvStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        multipart.Add(fileContent, "file", $"cv{extension}");
        request.Content = multipart;
        return await SendForJsonAsync(request, cancellationToken);
    }

    public async Task<AiServiceResponse> AnalyzeTextAsync(string cvText, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "analyze-text")
        {
            Content = JsonContent.Create(new { text = cvText }),
        };
        return await SendForJsonAsync(request, cancellationToken);
    }

    private async Task<AiServiceResponse> SendForJsonAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var startedTimestamp = Stopwatch.GetTimestamp();
        request.Headers.TryAddWithoutValidation("X-Internal-Key", _options.InternalApiKey);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }
        catch (HttpRequestException)
        {
            throw new AiServiceUnavailableException(
                null, Stopwatch.GetElapsedTime(startedTimestamp).TotalMilliseconds);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new AiServiceUnavailableException(
                null, Stopwatch.GetElapsedTime(startedTimestamp).TotalMilliseconds);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new AiServiceUnavailableException(
                    (int)response.StatusCode,
                    Stopwatch.GetElapsedTime(startedTimestamp).TotalMilliseconds);
            }

            await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var bounded = new MemoryStream();
            var buffer = new byte[81920];
            var totalBytes = 0;
            int bytesRead;
            while ((bytesRead = await responseStream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                totalBytes += bytesRead;
                if (totalBytes > MaxResponseBytes)
                {
                    throw new AiServiceUnavailableException(
                        (int)response.StatusCode,
                        Stopwatch.GetElapsedTime(startedTimestamp).TotalMilliseconds);
                }

                await bounded.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
            }

            var json = System.Text.Encoding.UTF8.GetString(bounded.GetBuffer(), 0, (int)bounded.Length);
            return new AiServiceResponse(json, Stopwatch.GetElapsedTime(startedTimestamp).TotalMilliseconds);
        }
    }
}

public sealed record AiServiceResponse(string Json, double ElapsedMilliseconds);

public sealed class AiServiceUnavailableException(int? httpStatusCode, double elapsedMilliseconds) : Exception
{
    public int? HttpStatusCode { get; } = httpStatusCode;
    public double ElapsedMilliseconds { get; } = elapsedMilliseconds;
}
