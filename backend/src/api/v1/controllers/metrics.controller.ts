import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(): Promise<string> {
    return this.metricsService.scrape();
  }
}
