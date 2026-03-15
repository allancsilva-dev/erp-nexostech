import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsDocument } from '../../../common/validators/is-document.decorator';
import { IsPhone } from '../../../common/validators/is-phone.decorator';

export enum ContactType {
  FORNECEDOR = 'FORNECEDOR',
  CLIENTE = 'CLIENTE',
  AMBOS = 'AMBOS',
}

export class CreateContactDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @IsEnum(ContactType)
  type!: ContactType;

  @IsOptional()
  @IsDocument()
  document?: string;

  @IsOptional()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
