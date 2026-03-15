import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;
}
