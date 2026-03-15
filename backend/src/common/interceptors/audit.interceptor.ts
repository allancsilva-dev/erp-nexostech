import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';
import type { AuthUser } from '../types/auth-user.type';

type Snapshot = Record<string, unknown>;

type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly drizzleService: DrizzleService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      route?: { path?: string };
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      headers: Record<string, string | undefined>;
      requestId?: string;
      user?: AuthUser;
    }>();

    const method = request.method?.toUpperCase() ?? 'GET';
    if (method === 'GET') {
      return next.handle();
    }

    const resolvedPath = request.originalUrl ?? request.route?.path ?? 'unknown';
    const entity = this.resolveEntity(resolvedPath);
    const entityId = this.resolveEntityId(request.params);
    const beforeSnapshotPromise = this.fetchSnapshot(entity, entityId);

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          void this.writeAudit(request, responseBody, beforeSnapshotPromise).catch(() => undefined);
        },
      }),
    );
  }

  private async writeAudit(request: {
    method: string;
    originalUrl?: string;
    route?: { path?: string };
    params?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
    headers: Record<string, string | undefined>;
    ip?: string;
    requestId?: string;
    user?: AuthUser;
  },
  responseBody: unknown,
  beforeSnapshotPromise: Promise<Snapshot | null>,
  ): Promise<void> {
    const user = request.user;
    if (!user?.sub) {
      return;
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const resolvedPath = request.originalUrl ?? request.route?.path ?? 'unknown';
    const action = this.mapAction(request.method, resolvedPath);
    const entity = this.resolveEntity(resolvedPath);
    const entityId = this.resolveEntityId(request.params, responseBody);
    const beforeSnapshot = await beforeSnapshotPromise;
    const afterSnapshot = await this.fetchSnapshot(entity, entityId);
    const fieldChanges = this.buildFieldChanges(beforeSnapshot, afterSnapshot);
    const metadata = JSON.stringify({
      method: request.method,
      path: request.originalUrl ?? request.route?.path ?? null,
      paramKeys: Object.keys(request.params ?? {}),
      bodyKeys: Object.keys(request.body ?? {}),
      responseHasData: Boolean(
        typeof responseBody === 'object' && responseBody && 'data' in (responseBody as Record<string, unknown>),
      ),
    });

    await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.audit_logs (
        branch_id,
        user_id,
        user_email,
        action,
        entity,
        entity_id,
        field_changes,
        request_id,
        ip_address,
        metadata
      ) VALUES (
        ${quoteLiteral(request.headers['x-branch-id'] ?? null)},
        ${quoteLiteral(user.sub)},
        ${quoteLiteral(user.email ?? null)},
        ${quoteLiteral(action)},
        ${quoteLiteral(entity)},
        ${quoteLiteral(entityId)},
        ${quoteLiteral(JSON.stringify(fieldChanges))}::jsonb,
        ${quoteLiteral(request.requestId ?? null)},
        ${quoteLiteral(request.headers['x-forwarded-for'] ?? request.ip ?? null)},
        ${quoteLiteral(metadata)}::jsonb
      )
    `));
  }

  private async fetchSnapshot(entity: string, entityId: string): Promise<Snapshot | null> {
    if (!entityId || entityId === 'n/a') {
      return null;
    }

    const table = this.resolveEntityTable(entity);
    if (!table) {
      return null;
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT to_jsonb(t) AS payload
      FROM ${schema}.${quoteIdent(table)} t
      WHERE t.id = ${quoteLiteral(entityId)}
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    const payload = row?.payload;
    return payload && typeof payload === 'object' ? (payload as Snapshot) : null;
  }

  private resolveEntityTable(entity: string): string | null {
    const map: Record<string, string> = {
      entries: 'financial_entries',
      categories: 'categories',
      contacts: 'contacts',
      'bank-accounts': 'bank_accounts',
      transfers: 'financial_transfers',
      'collection-rules': 'collection_rules',
      'email-templates': 'email_templates',
      branches: 'branches',
      roles: 'roles',
      approvals: 'entry_approvals',
      'approval-rules': 'approval_rules',
      boletos: 'financial_boletos',
      reconciliation: 'reconciliation_items',
    };

    return map[entity] ?? null;
  }

  private mapAction(method: string, path: string): string {
    const upperMethod = method.toUpperCase();
    if (upperMethod === 'POST' && path.includes('/pay')) {
      return 'PAY';
    }

    if (upperMethod === 'POST' && path.includes('/cancel')) {
      return 'CANCEL';
    }

    if (upperMethod === 'POST' && path.includes('/restore')) {
      return 'RESTORE';
    }

    if (upperMethod === 'POST' && path.includes('/reconciliation/match')) {
      return 'RECONCILE';
    }

    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private resolveEntity(url: string): string {
    const cleanPath = url.split('?')[0] ?? url;
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
      return segments[2];
    }

    return segments[0] ?? 'unknown';
  }

  private resolveEntityId(
    params?: Record<string, string | undefined>,
    responseBody?: unknown,
  ): string {
    if (!params && !responseBody) return 'n/a';
    const firstParam = params
      ? Object.values(params).find((value) => Boolean(value))
      : undefined;
    if (firstParam) {
      return firstParam;
    }

    if (responseBody && typeof responseBody === 'object') {
      const data = (responseBody as Record<string, unknown>).data;
      if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>)) {
        const id = (data as Record<string, unknown>).id;
        if (typeof id === 'string') {
          return id;
        }
      }
    }

    return 'n/a';
  }

  private buildFieldChanges(beforeSnapshot: Snapshot | null, afterSnapshot: Snapshot | null): FieldChange[] {
    if (!beforeSnapshot && !afterSnapshot) {
      return [];
    }

    const allKeys = new Set<string>([
      ...Object.keys(beforeSnapshot ?? {}),
      ...Object.keys(afterSnapshot ?? {}),
    ]);

    const changes: FieldChange[] = [];
    for (const key of allKeys) {
      const oldValue = beforeSnapshot?.[key] ?? null;
      const newValue = afterSnapshot?.[key] ?? null;
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue });
      }
    }

    return changes;
  }
}
