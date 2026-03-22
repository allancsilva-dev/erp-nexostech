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
        const dueRows = await this.drizzleService.getClient().execute(
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
      `),
        );

        for (const raw of dueRows.rows) {
          const row = raw as unknown as RecurrenceRow;
          const dueDate = String(row.next_due_date);
          const issueDate = new Date().toISOString().slice(0, 10);
          const docType = row.type === 'PAYABLE' ? 'PAY' : 'REC';
          const year = new Date(dueDate).getFullYear();
          const nextNumber = await this.nextSequenceNumber(
            schema,
            year,
            docType,
          );
          const documentNumber = `${docType}-${year}-${String(nextNumber).padStart(5, '0')}`;

          await this.drizzleService.getClient().execute(
            sql.raw(`
          INSERT INTO ${schema}.financial_entries (
            branch_id, document_number, type, description,
            amount, issue_date, due_date, status,
            category_id, contact_id, bank_account_id,
            created_by
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
        `),
          );

          const nextDueDate = this.calculateNextDueDate(dueDate, row.frequency);
          await this.drizzleService.getClient().execute(
            sql.raw(`
          UPDATE ${schema}.recurrences
          SET
            generated_count = generated_count + 1,
            last_generated_at = NOW(),
            next_due_date = ${quoteLiteral(nextDueDate)},
            active = CASE
              WHEN max_occurrences IS NOT NULL AND generated_count + 1 >= max_occurrences THEN false
              ELSE active
            END,
            updated_at = NOW()
          WHERE id = ${quoteLiteral(row.id)}
        `),
          );
        }
      },
    );
  }

  private async nextSequenceNumber(
    schema: string,
    year: number,
    docType: string,
  ): Promise<number> {
    await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.document_sequences (sequence_year, doc_type, next_number)
      VALUES (${quoteLiteral(year)}, ${quoteLiteral(docType)}, 1)
      ON CONFLICT (sequence_year, doc_type)
      DO NOTHING
    `),
    );

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.document_sequences
      SET next_number = next_number + 1,
          updated_at = NOW()
      WHERE sequence_year = ${quoteLiteral(year)}
        AND doc_type = ${quoteLiteral(docType)}
      RETURNING next_number - 1 AS current_number
    `),
    );

    const row = result.rows[0];
    return Number(row.current_number);
  }

  private calculateNextDueDate(currentDate: string, frequency: string): string {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'BIWEEKLY':
        date.setDate(date.getDate() + 14);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'MONTHLY':
      default:
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date.toISOString().slice(0, 10);
  }
}
