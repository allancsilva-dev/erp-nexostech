import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

type SqlExecutor = {
  execute(query: unknown): Promise<unknown>;
};

@Injectable()
export class OutboxService {
  async insert(
    tx: SqlExecutor,
    tenantId: string,
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await tx.execute(
      sql`
        INSERT INTO public.outbox_events (tenant_id, event_name, payload)
        VALUES (
          ${tenantId}::uuid,
          ${eventName},
          ${JSON.stringify(payload)}::jsonb
        )
      `,
    );
  }
}