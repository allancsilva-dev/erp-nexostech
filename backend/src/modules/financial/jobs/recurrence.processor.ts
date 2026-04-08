import { Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { resolveTenantSchema, optionalBranchClause } from './jobs.util';

type RecurrenceRow = {
  id: string;
  branch_id: string;
  type: string;
  description: string;
  amount: string;
  category_id: string;
  contact_id: string | null;
  bank_account_id: string | null;
  frequency: string;
  next_due_date: string;
  created_by: string;
  generated_count: number;
  max_occurrences: number | null;
};

@Injectable()
export class RecurrenceProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerProcessor(
      'financial.recurrence',
      async (payload) => {
        const schema = resolveTenantSchema(payload);
        const branchClause = optionalBranchClause(payload, 'branch_id');
        await this.drizzleService.transaction(async (tx) => {
          const dueRows = await tx.execute(
            sql.raw(`
              SELECT
                id, branch_id, type, description, amount,
                category_id, contact_id, bank_account_id,
                frequency, next_due_date, created_by,
                generated_count, max_occurrences
              FROM ${schema}.recurrences
              WHERE active = true
                AND deleted_at IS NULL
                AND next_due_date <= CURRENT_DATE
                ${branchClause}
                AND (max_occurrences IS NULL OR generated_count < max_occurrences)
              ORDER BY next_due_date ASC
              LIMIT 100
              FOR UPDATE SKIP LOCKED
            `),
          );

          for (const raw of dueRows.rows) {
            const row = raw as unknown as RecurrenceRow;
            const dueDate = String(row.next_due_date).slice(0, 10);
            const issueDate = new Date().toISOString().slice(0, 10);
            const docType = row.type === 'PAYABLE' ? 'PAY' : 'REC';
            const year = new Date(`${dueDate}T00:00:00.000Z`).getUTCFullYear();

            const seqRes: unknown = await tx.execute(
              sql.raw(`
                INSERT INTO ${schema}.document_sequences (branch_id, type, year, last_sequence)
                VALUES (${quoteLiteral(row.branch_id)}, ${quoteLiteral(docType)}, ${year}, 1)
                ON CONFLICT (branch_id, type, year)
                DO UPDATE SET
                  last_sequence = ${schema}.document_sequences.last_sequence + 1,
                  updated_at = NOW()
                RETURNING last_sequence
              `),
            );

            const seqRows = Array.isArray((seqRes as { rows?: unknown })?.rows)
              ? ((seqRes as { rows: unknown[] }).rows as Array<Record<string, unknown>>)
              : [];
            const nextSeq = Number(seqRows[0]?.last_sequence ?? 1);
            const prefix = row.type === 'PAYABLE' ? 'PAY' : 'REC';
            const documentNumber = `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;

            await tx.execute(
              sql.raw(`
                INSERT INTO ${schema}.financial_entries (
                  branch_id, document_number, type, description,
                  amount, issue_date, due_date, status,
                  category_id, contact_id, bank_account_id, created_by
                ) VALUES (
                  ${quoteLiteral(row.branch_id)},
                  ${quoteLiteral(documentNumber)},
                  ${quoteLiteral(row.type)},
                  ${quoteLiteral(row.description)},
                  ${quoteLiteral(row.amount)},
                  ${quoteLiteral(issueDate)},
                  ${quoteLiteral(dueDate)},
                  'PENDING',
                  ${quoteLiteral(row.category_id)},
                  ${quoteLiteral(row.contact_id)},
                  ${quoteLiteral(row.bank_account_id)},
                  ${quoteLiteral(row.created_by)}
                )
                ON CONFLICT (branch_id, document_number) WHERE deleted_at IS NULL
                DO NOTHING
              `),
            );

            const nextDueDate = this.calculateNextDueDate(dueDate, row.frequency);
            await tx.execute(
              sql.raw(`
                UPDATE ${schema}.recurrences
                SET
                  generated_count = generated_count + 1,
                  last_generated_at = NOW(),
                  next_due_date = ${quoteLiteral(nextDueDate)},
                  active = CASE
                    WHEN max_occurrences IS NOT NULL AND generated_count + 1 >= max_occurrences
                    THEN false
                    ELSE active
                  END,
                  updated_at = NOW()
                WHERE id = ${quoteLiteral(row.id)}
              `),
            );
          }
        });
      },
    );
  }

  private calculateNextDueDate(currentDate: string, frequency: string): string {
    const [year, month, day] = currentDate.split('-').map(Number) as [number, number, number];

    switch (frequency) {
      case 'WEEKLY':
        return this.addDaysUtc(currentDate, 7);
      case 'BIWEEKLY':
        return this.addDaysUtc(currentDate, 14);
      case 'YEARLY':
        return `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'MONTHLY':
      default: {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
        const nextDay = Math.min(day, daysInNextMonth);
        return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      }
    }
  }

  private addDaysUtc(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
