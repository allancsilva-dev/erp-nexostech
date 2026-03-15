import { IsBoolean, IsInt, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsInt()
  @Min(1)
  @Max(28)
  closingDay!: number;

  @IsString()
  currency!: string;

  @IsInt()
  @Min(0)
  alertDaysBefore!: number;

  @IsBoolean()
  emailAlerts!: boolean;

  @IsInt()
  @Min(0)
  maxRefundDaysPayable!: number;

  @IsInt()
  @Min(0)
  maxRefundDaysReceivable!: number;
}
