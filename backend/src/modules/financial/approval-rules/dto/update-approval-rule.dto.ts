import { IsBoolean, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { EntryType } from '../../entries/dto/create-entry.dto';

export class UpdateApprovalRuleDto {
  @IsOptional()
  @IsEnum(EntryType)
  entryType?: EntryType;

  @IsOptional()
  @Matches(/^\d+\.\d{2}$/)
  minAmount?: string;

  @IsOptional()
  @IsUUID()
  approverRoleId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
