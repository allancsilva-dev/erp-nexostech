import { Injectable } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

type DrizzleTransaction = Parameters<
  Parameters<DrizzleService['transaction']>[0]
>[0];

@Injectable()
export class TransactionHelper {
  constructor(private readonly drizzleService: DrizzleService) {}

  async run<T>(callback: (tx: DrizzleTransaction) => Promise<T>): Promise<T> {
    return this.drizzleService.transaction(async (tx) => callback(tx));
  }
}
