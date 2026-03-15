import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly db: NodePgDatabase;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContextService: TenantContextService,
  ) {
    this.pool = new Pool({
      connectionString: this.configService.getOrThrow<string>('DATABASE_URL'),
      statement_timeout: this.configService.get<number>(
        'DATABASE_STATEMENT_TIMEOUT_MS',
        5000,
      ),
      max: this.configService.get<number>('DATABASE_POOL_MAX', 20),
      idleTimeoutMillis: this.configService.get<number>('DATABASE_POOL_IDLE_TIMEOUT_MS', 30000),
      connectionTimeoutMillis: this.configService.get<number>(
        'DATABASE_POOL_CONNECTION_TIMEOUT_MS',
        10000,
      ),
    });

    this.db = drizzle(this.pool);
  }

  getClient(): NodePgDatabase {
    return this.db;
  }

  getTenantDb(): NodePgDatabase {
    const schema = this.getTenantSchema();
    // Safety com pgBouncer: schema explícito por query builder, sem SET search_path.
    return (this.db as any).withSchema(schema);
  }

  getTenantSchema(): string {
    return this.tenantContextService.getTenantSchema();
  }

  async transaction<T>(
    callback: (tx: Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => callback(tx));
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
