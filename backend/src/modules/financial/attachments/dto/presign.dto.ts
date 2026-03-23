import { IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

export class PresignDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @IsPositive()
  sizeBytes!: number;

  @IsUUID()
  entryId!: string;
}
