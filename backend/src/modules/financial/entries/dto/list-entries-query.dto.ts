import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EntryType } from './create-entry.dto';

const ENTRY_STATUS_VALUES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'PENDING',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export type EntryStatus = (typeof ENTRY_STATUS_VALUES)[number];

export class ListEntriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(Object.values(EntryType))
  type?: EntryType;

  @IsOptional()
  @IsIn(ENTRY_STATUS_VALUES)
  status?: EntryStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'dueDate', 'amount'])
  sortBy?: 'createdAt' | 'dueDate' | 'amount';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
