using System.Net.Http.Headers;
using System.Net.Http.Json;
using CvAdvisor.Api.Configuration;
using Microsoft.Extensions.Options;

namespace CvAdvisor.Api.Services;

public sealed class AiServiceClient(HttpClient httpClient, IOptions<AiServiceOptions> options)
{
    private const int MaxResponseBytes = 1024 * 1024;
    private readonly AiServiceOptions _options = options.Value;

    public async Task<string> AnalyzeAsync(
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

    public async Task<string> AnalyzeTextAsync(string cvText, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "analyze-text")
        {
            Content = JsonContent.Create(new { text = cvText }),
        };
        return await SendForJsonAsync(request, cancellationToken);
    }

    private async Task<string> SendForJsonAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
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
            throw new AiServiceUnavailableException();
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new AiServiceUnavailableException();
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new AiServiceUnavailableException();
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
                    throw new AiServiceUnavailableException();
                }

                await bounded.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
            }

            return System.Text.Encoding.UTF8.GetString(bounded.GetBuffer(), 0, (int)bounded.Length);
        }
    }
}

public sealed class AiServiceUnavailableException : Exception
{
}
