import { IsString, IsUUID, Matches } from 'class-validator';

export class GenerateBoletoDto {
  @IsUUID()
  entryId!: string;

  @Matches(/^\d+\.\d{2}$/)
  amount!: string;

  @IsString()
  dueDate!: string;
}
