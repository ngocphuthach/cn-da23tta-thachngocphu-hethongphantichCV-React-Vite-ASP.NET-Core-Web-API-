using System.Threading.Channels;

namespace CvAdvisor.Api.Services;

public sealed class AnalysisWorkQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateBounded<Guid>(
        new BoundedChannelOptions(512)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false,
        });

    public bool TryEnqueue(Guid analysisId) => _channel.Writer.TryWrite(analysisId);

    public ValueTask EnqueueAsync(Guid analysisId, CancellationToken cancellationToken) =>
        _channel.Writer.WriteAsync(analysisId, cancellationToken);

    public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
