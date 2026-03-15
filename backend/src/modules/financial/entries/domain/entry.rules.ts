import { BusinessException } from '../../../../common/exceptions/business.exception';
import Decimal from 'decimal.js';
import { CreateEntryDto } from '../dto/create-entry.dto';

export class EntryRules {
  validateCreate(dto: CreateEntryDto, lockedUntil: Date | null): void {
    if (new Decimal(dto.amount).lessThanOrEqualTo(0)) {
      throw new BusinessException(
        'VALIDATION_ERROR',
        'Valor deve ser positivo',
        {
          field: 'amount',
        },
        400,
      );
    }

    if (dto.dueDate < dto.issueDate) {
      throw new BusinessException(
        'VALIDATION_ERROR',
        'Vencimento deve ser >= emissao',
        {
          dueDate: dto.dueDate,
          issueDate: dto.issueDate,
        },
        400,
      );
    }

    if (lockedUntil && new Date(dto.issueDate) <= lockedUntil) {
      throw new BusinessException(
        'ENTRY_LOCKED_PERIOD',
        'Este lancamento esta em um periodo contabil bloqueado',
        {
          lockedUntil: lockedUntil.toISOString().slice(0, 10),
          entryDate: dto.issueDate,
        },
      );
    }
  }
}
