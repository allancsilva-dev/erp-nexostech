import { MetricsController } from './metrics.controller';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';

describe('MetricsController', () => {
  it('returns prom metrics payload', async () => {
    const metricsService = {
      scrape: jest
        .fn()
        .mockResolvedValue(
          '# HELP test_metric test\n# TYPE test_metric counter\ntest_metric 1',
        ),
    } as unknown as MetricsService;

    const controller = new MetricsController(metricsService);
    const payload = await controller.scrape();

    expect(metricsService.scrape).toHaveBeenCalledTimes(1);
    expect(payload).toContain('test_metric');
  });
});
