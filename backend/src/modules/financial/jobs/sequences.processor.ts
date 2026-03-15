import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';

@Injectable()
export class SequencesProcessor implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit(): void {
    this.queueService.registerProcessor('financial.sequences', async (_payload) => {
      // Placeholder: inicializar document_sequences anual.
    });
  }
}
