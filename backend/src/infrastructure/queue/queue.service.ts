import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly redisUrl: string;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
  }

  async add(
    queueName: string,
    jobName: string,
    payload: Record<string, unknown>,
    options?: JobsOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, payload, options);
  }

  registerProcessor(
    queueName: string,
    handler: (payload: Record<string, unknown>) => Promise<void>,
  ): void {
    const worker = new Worker(
      queueName,
      async (job) => handler(job.data as Record<string, unknown>),
      { connection: { url: this.redisUrl } },
    );
    this.workers.push(worker);
  }

  private getQueue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const queue = new Queue(name, { connection: { url: this.redisUrl } });
    this.queues.set(name, queue);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
  }
}
