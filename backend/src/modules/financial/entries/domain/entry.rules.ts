import { BusinessException } from '../../../../common/exceptions/business.exception';
import Decimal from 'decimal.js';
import { CreateEntryDto } from '../dto/create-entry.dto';

export class EntryRules {
  validateCreate(dto: CreateEntryDto, lockedUntil: Date | null): void {
    if (new Decimal(dto.amount).lessThanOrEqualTo(0)) {
      throw new BusinessException('VALIDATION_AMOUNT', 400, {
        field: 'amount',
      });
    }

    if (dto.dueDate < dto.issueDate) {
      throw new BusinessException('VALIDATION_DATE_ORDER', 400, {
        dueDate: dto.dueDate,
        issueDate: dto.issueDate,
      });
    }

    if (lockedUntil && new Date(dto.issueDate) <= lockedUntil) {
      throw new BusinessException('ENTRY_LOCKED_PERIOD', undefined, {
        lockedUntil: lockedUntil.toISOString().slice(0, 10),
        entryDate: dto.issueDate,
      });
    }
  }
}
