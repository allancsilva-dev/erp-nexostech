import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { ContactType } from './create-contact.dto';

export class ListContactsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContactType, { message: 'type deve ser FORNECEDOR, CLIENTE ou AMBOS' })
  type?: ContactType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
