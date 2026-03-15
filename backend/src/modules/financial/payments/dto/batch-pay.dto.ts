import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { RegisterPaymentDto } from './register-payment.dto';

export class BatchPayItemDto extends RegisterPaymentDto {
  @IsUUID()
  entryId!: string;
}

export class BatchPayDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchPayItemDto)
  items!: BatchPayItemDto[];
}
