import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';

@Injectable()
export class OverdueProcessor implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.overdue', async (_payload) => {
      // Placeholder: atualizar status para OVERDUE.
    });
  }
}
