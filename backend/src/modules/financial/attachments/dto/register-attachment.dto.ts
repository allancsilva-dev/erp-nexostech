import { IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

export class RegisterAttachmentDto {
  @IsUUID()
  entryId!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @IsPositive()
  sizeBytes!: number;
}
