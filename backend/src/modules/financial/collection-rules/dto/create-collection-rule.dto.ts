import { IsBoolean, IsEnum, IsInt, IsUUID, Min } from 'class-validator';

export enum CollectionEventType {
  BEFORE_DUE = 'BEFORE_DUE',
  ON_DUE = 'ON_DUE',
  AFTER_DUE = 'AFTER_DUE',
  ON_PAYMENT = 'ON_PAYMENT',
}

export class CreateCollectionRuleDto {
  @IsEnum(CollectionEventType)
  event!: CollectionEventType;

  @IsInt()
  daysOffset!: number;

  @IsUUID()
  emailTemplateId!: string;

  @IsBoolean()
  active!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}
