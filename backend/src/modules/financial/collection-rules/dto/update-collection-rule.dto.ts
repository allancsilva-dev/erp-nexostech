import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { CollectionEventType } from './create-collection-rule.dto';

export class UpdateCollectionRuleDto {
  @IsOptional()
  @IsEnum(CollectionEventType)
  event?: CollectionEventType;

  @IsOptional()
  @IsInt()
  daysOffset?: number;

  @IsOptional()
  @IsUUID()
  emailTemplateId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
