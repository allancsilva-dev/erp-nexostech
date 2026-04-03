import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { EntryType } from '../../entries/dto/create-entry.dto';

export class CreateApprovalRuleDto {
  @IsOptional()
  @IsEnum(EntryType, { message: 'Tipo de lancamento invalido' })
  entryType?: EntryType;

  @Matches(/^\d+\.\d{2}$/, {
    message: 'Valor minimo invalido. Informe um numero com 2 casas decimais',
  })
  minAmount!: string;

  @IsUUID('4', { message: 'Role aprovadora invalida' })
  approverRoleId!: string;

  @IsBoolean({ message: 'Indicador de regra ativa invalido' })
  active!: boolean;
}
