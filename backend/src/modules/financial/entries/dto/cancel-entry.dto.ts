import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
