import { MetricsController } from './metrics.controller';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';

describe('MetricsController', () => {
  it('returns prom metrics payload', async () => {
    const scrapeMock = jest
      .fn()
      .mockResolvedValue(
        '# HELP test_metric test\n# TYPE test_metric counter\ntest_metric 1',
      );
    const metricsService = {
      scrape: scrapeMock,
    } as unknown as MetricsService;

    const controller = new MetricsController(metricsService);
    const payload = await controller.scrape();

    expect(scrapeMock).toHaveBeenCalledTimes(1);
    expect(payload).toContain('test_metric');
  });
});
