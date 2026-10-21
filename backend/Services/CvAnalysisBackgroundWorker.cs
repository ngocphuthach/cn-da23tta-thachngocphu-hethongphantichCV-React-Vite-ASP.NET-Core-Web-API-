using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public sealed class CvAnalysisBackgroundWorker(
    AnalysisWorkQueue workQueue,
    IServiceScopeFactory scopeFactory,
    ILogger<CvAnalysisBackgroundWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var recoveryTask = RecoverPendingWorkAsync(stoppingToken);

        try
        {
            await foreach (var analysisId in workQueue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var analysisService = scope.ServiceProvider.GetRequiredService<CvAnalysisService>();
                    await analysisService.ProcessPendingAsync(analysisId, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception)
                {
                    logger.LogWarning(
                        "Background analysis attempt could not start. AnalysisId={AnalysisId}; retrying.", analysisId);
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                        await workQueue.EnqueueAsync(analysisId, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Application is stopping; processing scopes are disposed after their work exits.
        }

        await recoveryTask;
    }

    private async Task RecoverPendingWorkAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<CvCareerDbContext>();
                await dbContext.CVAnalyses
                    .Where(item => item.Status == CvAnalysisStatus.Processing)
                    .ExecuteUpdateAsync(updates => updates
                        .SetProperty(item => item.Status, CvAnalysisStatus.Pending), cancellationToken);
                var pendingIds = await dbContext.CVAnalyses.AsNoTracking()
                    .Where(item => item.Status == CvAnalysisStatus.Pending)
                    .OrderBy(item => item.CreatedAt)
                    .Select(item => item.AnalysisId)
                    .ToListAsync(cancellationToken);

                foreach (var analysisId in pendingIds)
                {
                    await workQueue.EnqueueAsync(analysisId, cancellationToken);
                }

                return;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return;
            }
            catch
            {
                logger.LogWarning("Could not recover pending CV analyses; retrying shortly.");
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    return;
                }
            }
        }
    }
}
