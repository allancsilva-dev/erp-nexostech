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
import { ContactType } from './create-contact.dto';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

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
