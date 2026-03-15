import { Injectable } from '@nestjs/common';
import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private static readonly registry = new Registry();
  private static initialized = false;
  private static readonly requestCounter = new Counter({
    name: 'nexos_metrics_scrapes_total',
    help: 'Total number of metrics endpoint scrapes',
    registers: [MetricsService.registry],
  });

  constructor() {
    if (!MetricsService.initialized) {
      collectDefaultMetrics({ register: MetricsService.registry });
      MetricsService.initialized = true;
    }
  }

  async scrape(): Promise<string> {
    MetricsService.requestCounter.inc();
    return MetricsService.registry.metrics();
  }
}
