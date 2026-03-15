import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';

@Injectable()
export class RecurrenceProcessor implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.recurrence', async (_payload) => {
      // Placeholder: gerar recorrencias.
    });
  }
}
