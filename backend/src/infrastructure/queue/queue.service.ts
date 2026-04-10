import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions } from 'bullmq';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5_000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeNestedOption<T>(
  base: T | undefined,
  override: T | undefined,
): T | undefined {
  if (isPlainObject(base) && isPlainObject(override)) {
    return { ...base, ...override } as T;
  }

  return override ?? base;
}

function mergeJobOptions(options?: JobsOptions): JobsOptions {
  return {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
    backoff: mergeNestedOption(DEFAULT_JOB_OPTIONS.backoff, options?.backoff),
    removeOnComplete: mergeNestedOption(
      DEFAULT_JOB_OPTIONS.removeOnComplete,
      options?.removeOnComplete,
    ),
    removeOnFail: mergeNestedOption(
      DEFAULT_JOB_OPTIONS.removeOnFail,
      options?.removeOnFail,
    ),
  };
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
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
    await queue.add(jobName, payload, mergeJobOptions(options));
  }

  async addIdempotent(
    queueName: string,
    jobName: string,
    payload: Record<string, unknown>,
    jobId: string,
    options?: Omit<JobsOptions, 'jobId'>,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    const fullJobId = `${queueName}:${jobName}:${jobId}`;

    await queue.add(jobName, payload, {
      ...mergeJobOptions(options),
      jobId: fullJobId,
    });
  }

  registerProcessor(
    queueName: string,
    handler: (payload: Record<string, unknown>) => Promise<void>,
    options: { concurrency?: number; timeoutMs?: number } = {},
  ): void {
    const concurrency = options.concurrency ?? 5;
    const timeoutMs = options.timeoutMs ?? 30_000;

    const worker = new Worker(
      queueName,
      async (job) => {
        await Promise.race([
          handler(job.data as Record<string, unknown>),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `Job timeout apos ${timeoutMs}ms: queue=${queueName} jobId=${job.id}`,
                ),
              );
            }, timeoutMs);
          }),
        ]);
      },
      {
        connection: { url: this.redisUrl },
        concurrency,
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Job falhou: queue=${queueName} jobId=${job?.id} attempt=${job?.attemptsMade}/${DEFAULT_JOB_OPTIONS.attempts}`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    worker.on('completed', (job) => {
      this.logger.debug(`Job concluido: queue=${queueName} jobId=${job.id}`);
    });

    this.workers.push(worker);
  }

  private getQueue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const queue = new Queue(name, {
      connection: { url: this.redisUrl },
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    this.queues.set(name, queue);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close()),
    );
  }
}
