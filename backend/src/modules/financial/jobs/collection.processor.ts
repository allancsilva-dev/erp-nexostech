import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';

@Injectable()
export class CollectionProcessor implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.collection', async (_payload) => {
      // Placeholder: envio da regua de cobranca.
    });
  }
}
