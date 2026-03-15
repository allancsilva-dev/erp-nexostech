import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLockPeriodDto {
  @IsDateString()
  lockedUntil!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
