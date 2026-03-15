import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { EntryType } from '../../entries/dto/create-entry.dto';

export class CreateApprovalRuleDto {
  @IsOptional()
  @IsEnum(EntryType)
  entryType?: EntryType;

  @Matches(/^\d+\.\d{2}$/)
  minAmount!: string;

  @IsUUID()
  approverRoleId!: string;

  @IsBoolean()
  active!: boolean;
}
