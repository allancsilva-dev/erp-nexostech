import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';

export interface NotificationRow {
  id: string;
  user_id: string;
  branch_id: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async create(
    schemaPayload: string,
    data: {
      userId: string | null;
      branchId: string | null;
      type: string;
      title: string;
      message: string;
      metadata?: Record<string, unknown> | null;
      jobId?: string | null;
    },
  ): Promise<void> {
    const schema = quoteIdent(schemaPayload);
    const userId = data.userId ? quoteLiteral(data.userId) : 'NULL';
    const branchId = data.branchId ? quoteLiteral(data.branchId) : 'NULL';
    const type = quoteLiteral(data.type);
    const title = quoteLiteral(data.title);
    const message = quoteLiteral(data.message);
    const metadata = data.metadata
      ? quoteLiteral(JSON.stringify(data.metadata))
      : 'NULL';

    try {
      await this.drizzle.getClient().execute(
        sql.raw(`
          INSERT INTO ${schema}.notifications (
            user_id, branch_id, type, title, message, metadata, created_at
          ) VALUES (
            ${userId}, ${branchId}, ${type}, ${title}, ${message}, ${metadata}, NOW()
          )
          ON CONFLICT (
            user_id,
            type,
            (metadata->>'entry_id')::uuid,
            date_trunc('day', created_at AT TIME ZONE 'UTC')
          ) WHERE metadata->>'entry_id' IS NOT NULL
          DO NOTHING
        `),
      );
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === '23505'
      ) {
        return;
      }
      this.logger.error(
        `Erro ao criar notificação: ${e instanceof Error ? e.stack : String(e)}`,
      );
    }
  }

  async findForUser(
    schemaPayload: string,
    userId: string,
    opts: { page?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<{ data: NotificationRow[]; total: number; unread_count: number }> {
    const schema = quoteIdent(schemaPayload);
    const page = Math.max(1, opts.page ?? 1);
    const safeLimit = Math.min(Math.max(1, opts.limit ?? 20), 100);
    const offset = (page - 1) * safeLimit;
    const userLiteral = quoteLiteral(userId);
    const unreadClause = opts.unreadOnly ? `AND read_at IS NULL` : '';

    const qData = sql.raw(`
      SELECT id, user_id, branch_id, type, title, message, metadata, read_at, created_at
      FROM ${schema}.notifications
      WHERE user_id = ${userLiteral} AND deleted_at IS NULL
      ${unreadClause}
      ORDER BY created_at DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `);

    const qTotal = sql.raw(`
      SELECT COUNT(*)::int AS total
      FROM ${schema}.notifications
      WHERE user_id = ${userLiteral} AND deleted_at IS NULL
      ${unreadClause}
    `);

    const qUnread = sql.raw(`
      SELECT COUNT(*)::int AS unread
      FROM ${schema}.notifications
      WHERE user_id = ${userLiteral} AND read_at IS NULL AND deleted_at IS NULL
    `);

    const [dataRes, totalRes, unreadRes] = await Promise.all([
      this.drizzle.getClient().execute(qData),
      this.drizzle.getClient().execute(qTotal),
      this.drizzle.getClient().execute(qUnread),
    ]);

    const rows = Array.isArray(dataRes?.rows)
      ? (dataRes.rows as unknown as NotificationRow[])
      : [];
    const total = Number(
      (totalRes?.rows as Array<{ total: unknown }>)?.[0]?.total ?? 0,
    );
    const unread_count = Number(
      (unreadRes?.rows as Array<{ unread: unknown }>)?.[0]?.unread ?? 0,
    );

    return { data: rows, total, unread_count };
  }

  async countUnread(schemaPayload: string, userId: string): Promise<number> {
    const schema = quoteIdent(schemaPayload);
    const userLiteral = quoteLiteral(userId);
    const res = await this.drizzle.getClient().execute(
      sql.raw(`
        SELECT COUNT(*)::int AS unread
        FROM ${schema}.notifications
        WHERE user_id = ${userLiteral} AND read_at IS NULL AND deleted_at IS NULL
      `),
    );
    return Number((res?.rows as Array<{ unread: unknown }>)?.[0]?.unread ?? 0);
  }

  async markAsRead(
    schemaPayload: string,
    userId: string,
    id: string,
  ): Promise<void> {
    const schema = quoteIdent(schemaPayload);
    await this.drizzle.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.notifications
      SET read_at = NOW()
      WHERE id = ${quoteLiteral(id)}
        AND user_id = ${quoteLiteral(userId)}
        AND read_at IS NULL AND deleted_at IS NULL
    `),
    );
  }

  async markAllAsRead(schemaPayload: string, userId: string): Promise<void> {
    const schema = quoteIdent(schemaPayload);
    await this.drizzle.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.notifications
      SET read_at = NOW()
      WHERE user_id = ${quoteLiteral(userId)}
        AND read_at IS NULL AND deleted_at IS NULL
    `),
    );
  }

  async softDelete(
    schemaPayload: string,
    userId: string,
    id: string,
  ): Promise<void> {
    const schema = quoteIdent(schemaPayload);
    await this.drizzle.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.notifications
      SET deleted_at = NOW()
      WHERE id = ${quoteLiteral(id)}
        AND user_id = ${quoteLiteral(userId)}
        AND deleted_at IS NULL
    `),
    );
  }
}
