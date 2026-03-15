import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCep } from '../../../common/validators/is-cep.decorator';
import { IsPhone } from '../../../common/validators/is-phone.decorator';

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
  document?: string;

  @IsOptional()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  addressState?: string;

  @IsOptional()
  @IsCep()
  addressZip?: string;
}
